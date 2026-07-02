import 'webauthn-polyfills';

/**
 * Trigger Conditional Create (Silent Post-Login Registration)
 * Should be called immediately after a successful password login.
 */
export async function triggerConditionalCreate(loginAbortController: AbortController) {
  const capabilities = await PublicKeyCredential.getClientCapabilities();
  if (capabilities.conditionalCreate !== true) {
    return; // Platform does not support conditional creation
  }

  // Abort any active autofill conditional-get controllers to clear the WebAuthn pipeline
  loginAbortController.abort();

  try {
    const res = await fetch('/api/passkeys/register/options', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    if (!res.ok) return;
    const optionsJSON = await res.json();
    
    // Parse using the webauthn-polyfills
    const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(optionsJSON);

    let credential;
    try {
      // Invoke silent credentials creation prompt
      credential = await navigator.credentials.create({ 
        publicKey,
        mediation: 'conditional'
      }) as PublicKeyCredential;
    } catch (e: any) {
      // Silently swallow common WebAuthn browser exceptions
      if (['InvalidStateError', 'NotAllowedError', 'AbortError'].includes(e.name)) {
        return; 
      }
      console.error('Unexpected conditional create error:', e);
      return;
    }

    if (!credential) return;

    let encodedResponse = credential.toJSON();
    
    try {
      const verifyRes = await fetch('/api/passkeys/register/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(encodedResponse)
      });
      
      if (!verifyRes.ok) {
        // If the server verification fails, clean up using Signal API
        if (PublicKeyCredential.signalUnknownCredential) {
          await PublicKeyCredential.signalUnknownCredential({
            rpId: 'localhost', // Or dynamic RP ID
            credentialId: encodedResponse.id
          });
        }
      }
    } catch (serverErr) {
      console.error('Verification network failure:', serverErr);
      if (PublicKeyCredential.signalUnknownCredential) {
        await PublicKeyCredential.signalUnknownCredential({
          rpId: 'localhost',
          credentialId: encodedResponse.id
        });
      }
    }
  } catch (e) {
    console.error('Failed conditional create initialization', e);
  }
}

/**
 * Triggers an Explicit Registration (e.g. from a Settings page)
 */
export async function registerPasskey() {
  const res = await fetch('/api/passkeys/register/options', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
  });
  if (!res.ok) throw new Error('Failed to fetch registration options');
  const optionsJSON = await res.json();
  
  const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(optionsJSON);

  const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;
  if (!credential) throw new Error('Passkey creation aborted');

  const verifyRes = await fetch('/api/passkeys/register/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: JSON.stringify(credential.toJSON())
  });

  const verifyData = await verifyRes.json();
  if (!verifyRes.ok) throw new Error(verifyData.error || 'Failed to verify passkey on server');
  
  return verifyData;
}

/**
 * Triggers Conditional UI (Autofill Login) or Explicit Login
 * @param abortController Optional abort controller to cancel an ongoing autofill request
 * @param conditional Boolean indicating if this is an autofill (conditional) request
 */
export async function authenticatePasskey(abortController?: AbortController, conditional: boolean = false) {
  const res = await fetch('/api/passkeys/auth/options');
  if (!res.ok) throw new Error('Failed to fetch authentication options');
  const { options: optionsJSON, challengeId } = await res.json();

  const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(optionsJSON);

  let credential;
  try {
    credential = await navigator.credentials.get({ 
      publicKey,
      mediation: conditional ? 'conditional' : 'optional',
      signal: abortController?.signal
    }) as PublicKeyCredential;
  } catch (e: any) {
    if (conditional && ['NotAllowedError', 'AbortError'].includes(e.name)) {
      // Ignore autofill abortion
      return null;
    }
    throw e;
  }

  if (!credential) return null;

  const encodedResponse = credential.toJSON();

  const verifyRes = await fetch('/api/passkeys/auth/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      response: encodedResponse,
      challengeId
    })
  });

  const verifyData = await verifyRes.json();
  
  if (!verifyRes.ok) {
    if (verifyData.code === 'UNKNOWN_CREDENTIAL' && PublicKeyCredential.signalUnknownCredential) {
      await PublicKeyCredential.signalUnknownCredential({
        rpId: 'localhost',
        credentialId: encodedResponse.id
      });
    }
    throw new Error(verifyData.error || 'Authentication failed');
  }

  return verifyData; // Returns { success, token, user }
}
