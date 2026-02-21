'use client';

import { useState } from 'react';
import ProfileMenu from '@/app/admin/components/ProfileMenu';

export default function DebugProfileMenuPage() {
  const [userName, setUserName] = useState('Администратор');
  const [userEmail, setUserEmail] = useState('admin@example.com');

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-6">Отладка ProfileMenu</h1>
      
      <div className="mb-6">
        <label className="block mb-2">Имя пользователя:</label>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="border p-2 rounded"
        />
      </div>
      
      <div className="mb-6">
        <label className="block mb-2">Email пользователя:</label>
        <input
          type="text"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          className="border p-2 rounded"
        />
      </div>
      
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Профиль меню</h2>
        <div className="flex justify-center">
          <ProfileMenu userName={userName} userEmail={userEmail} />
        </div>
      </div>
      
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Контекст с ограниченной шириной</h2>
        <div className="max-w-7xl mx-auto border border-dashed border-gray-300 p-4">
          <p className="mb-4">Этот контекст имеет ограничение по ширине (max-w-7xl)</p>
          <div className="flex justify-center">
            <ProfileMenu userName={userName} userEmail={userEmail} />
          </div>
        </div>
      </div>
    </div>
  );
}