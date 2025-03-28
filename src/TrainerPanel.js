import React from 'react'; 
import { Outlet } from 'react-router-dom'; 
import mdrrmo_logo from './logos/mdrrmo_logo.png';

const TrainerPanel = ({handleSignOut }) => {

  return (
    <div className="TrainerPanel">
      <header className="header">
        <img src={mdrrmo_logo} alt="Logo" className="logo" />
        <h1 className="title">MDRRMO Training Program Management System</h1>
        <button className="sign-out-button" onClick={handleSignOut}>Sign Out</button>
      </header>
      
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default TrainerPanel;
