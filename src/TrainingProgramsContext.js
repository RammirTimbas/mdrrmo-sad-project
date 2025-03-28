import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from './firebase/firebase'; 
import { collection, onSnapshot } from 'firebase/firestore';

const TrainingProgramsContext = createContext();

export const TrainingProgramsProvider = ({ children }) => {
  const [trainingPrograms, setTrainingPrograms] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'Training Programs'), (snapshot) => {
      const programs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTrainingPrograms(programs);
    });

    return () => unsubscribe();
  }, []);

  return (
    <TrainingProgramsContext.Provider value={trainingPrograms}>
      {children}
    </TrainingProgramsContext.Provider>
  );
};

// Custom hook for using the context
export const useTrainingPrograms = () => {
  return useContext(TrainingProgramsContext);
};
