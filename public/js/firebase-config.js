// Initialize Firebase using the Compat libraries for Vanilla JS usage
const firebaseConfig = {
    apiKey: "AIzaSyCXCLmlaMbjqXiSj1ilN8YJ3qPsArvMRdA",
    authDomain: "hostelspace-6322d.firebaseapp.com",
    projectId: "hostelspace-6322d",
    storageBucket: "hostelspace-6322d.firebasestorage.app",
    messagingSenderId: "902423683886",
    appId: "1:902423683886:web:d398d85fdbf253127b90bf",
    measurementId: "G-SYT554XRT8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = firebase.firestore();

// Export to window for global access
window.db = db;
