import { useEffect, useState } from 'react';
import { api } from '../../../utils/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: number;
}

export default function CustomersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // We assume a GET /api/users endpoint exists or will exist
    api.get<User[]>('/users')
      .then(data => {
        setUsers(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Customers Manager</h1>
      </div>

      <div className="bg-base-100 shadow-sm border border-base-200 rounded-box overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center"><span className="loading loading-spinner text-primary"></span></div>
        ) : (
          <table className="table w-full">
            <thead className="bg-base-200">
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="hover">
                  <td>{u.id}</td>
                  <td className="font-medium">{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <div className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-ghost'}`}>
                      {u.role}
                    </div>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="text-center py-4">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
