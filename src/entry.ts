import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from "cloudflare:workers";
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

// We are using Email Routing to send emails out and D1 for our cart database
type Env = {
  CART_WORKFLOW: Workflow;
  SEND_EMAIL: any;
  DB: any;
};

// Workflow parameters: we expect a cartId
type Params = {
  cartId: string;
};

// Adjust this to your Cloudflare zone using Email Routing
const merchantEmail = "sells@cybercoderbd.com";

// Uses mimetext npm to generate Email
const genEmail = (email: string, amount: number) => {
  const msg = createMimeMessage();
  msg.setSender({ name: "Pet shop", addr: merchantEmail });
  msg.setRecipient(email);
  msg.setSubject("You invoice");
  msg.addMessage({
    contentType: "text/plain",
    data: `Your invoice for ${amount} has been paid. Your products will be shipped shortly.`,
  });

  return new EmailMessage(merchantEmail, email, msg.asRaw());
};

// Workflow logic
export class cartInvoicesWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    await step.sleep("sleep for a while", "10 seconds");

    // Retrieve the cart from the D1 database
    // if the cart hasn't been checked out yet retry every 2 minutes, 10 times, otherwise give up
    const cart = await step.do(
      "retrieve cart",
      {
        retries: {
          limit: 10,
          delay: 2000 * 60,
          backoff: "constant",
        },
        timeout: "30 seconds",
      },
      async () => {
        const { results } = await this.env.DB.prepare(
          `SELECT * FROM cart WHERE id = ?`,
        )
          .bind(event.payload.cartId)
          .run();
        // should return { checkedOut: true, amount: 250 , account: { email: "celsomartinho@gmail.com" }};
        if (results[0].checkedOut === false) {
          throw new Error("cart hasn't been checked out yet");
        }
        return results[0];
      },
    );

    // Proceed to payment, retry 10 times every minute or give up
    const payment = await step.do(
      "payment",
      {
        retries: {
          limit: 10,
          delay: 1000 * 60,
          backoff: "constant",
        },
        timeout: "30 seconds",
      },
      async () => {
        let resp = await fetch("https://payment-processor.example.com/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({ amount: cart.amount }),
        });

        if (!resp.ok) {
          throw new Error("payment has failed");
        }

        return { success: true, amount: cart.amount };
      },
    );

    // Send invoice to the customer, retry 10 times every 5 minutes or give up
    // Requires that cart.account.email has previously been validated in Email Routing,
    // See https://developers.cloudflare.com/email-service/api/route-emails/email-handler/
    await step.do(
      "send invoice",
      {
        retries: {
          limit: 10,
          delay: 5000 * 60,
          backoff: "constant",
        },
        timeout: "30 seconds",
      },
      async () => {
        const message = genEmail(cart.account.email, payment.amount);
        try {
          await this.env.SEND_EMAIL.send(message);
        } catch (e) {
          throw new Error("failed to send invoice");
        }
      },
    );
  }
}

// Default page for admin
// Remove in production

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    let url = new URL(req.url);

    let id = new URL(req.url).searchParams.get("instanceId");

    // Get the status of an existing instance, if provided
    if (id) {
      let instance = await env.CART_WORKFLOW.get(id);
      return Response.json({
        status: await instance.status(),
      });
    }

    if (url.pathname.startsWith("/new")) {
      let instance = await env.CART_WORKFLOW.create({
        params: {
          cartId: "123",
        },
      });
      return Response.json({
        id: instance.id,
        details: await instance.status(),
      });
    }

    return new Response(
      `<html><body><a href="/new">new instance</a> or add ?instanceId=...</body></html>`,
      {
        headers: {
          "content-type": "text/html;charset=UTF-8",
        },
      },
    );
  },
};