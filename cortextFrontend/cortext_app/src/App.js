import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './cortextPages/home';
import SubscribePage from './cortextPages/subscribe';
import DocsPage from './cortextPages/docs';
import Login from './cortextPages/login';
import Signup from './cortextPages/signup';
import Dashboard from './cortextPages/dashboard';

import AdminLogin from './cortextPages/admin/adminlogin';
import AdminDash from './cortextPages/admin/adminDash';

import AppLayout from './cortextPages/AppLayout';

import MedicineFetcher from './cortextPages/admin/medicinePage';

import AddMedicineForm from './cortextPages/add_Medicine';

export default App;

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/subscribe" element={<SubscribePage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/adminDash" element={<AdminDash />} />

          <Route path="/medicinePage" element={<MedicineFetcher />} />
          <Route path="/addMedicinePage" element={<AddMedicineForm />} />
        </Route>
      </Routes>
    </Router>
  );
}
