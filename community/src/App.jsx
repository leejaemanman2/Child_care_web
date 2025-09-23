// ⛔ 잘못된 코드 (원인)
// import { BrowserRouter, Suspense } from 'react-router-dom';

import React, { Suspense } from 'react';      // ✅ Suspense는 react에서
import { BrowserRouter } from 'react-router-dom';
import RouterView from './app/routes.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 16 }}>로딩중…</div>}>
        <RouterView />
      </Suspense>
    </BrowserRouter>
  );
}
