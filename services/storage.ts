import { DB_TEMPLATE } from './dbTemplate';
import { AppData } from '../types';

const DB_KEY = 'life_tracker_db_v1';
const SESSION_KEY = 'life_tracker_session';

// --- INTERFACE FOR THE JSON FILE ---

export const StorageService = {
    // Initialize the DB from the template if empty
    init: () => {
        if (!localStorage.getItem(DB_KEY)) {
            localStorage.setItem(DB_KEY, JSON.stringify(DB_TEMPLATE));
        }
    },

    // Get the full database
    getDB: () => {
        try {
            const db = localStorage.getItem(DB_KEY);
            return db ? JSON.parse(db) : DB_TEMPLATE;
        } catch (e) {
            return DB_TEMPLATE;
        }
    },

    // Save the full database
    saveDB: (data: any) => {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
    },

    // User Management
    getUsers: () => {
        const db = StorageService.getDB();
        return db.users || [];
    },

    addUser: (user: any) => {
        const db = StorageService.getDB();
        const users = db.users || [];
        if (users.find((u: any) => u.email === user.email)) {
            throw new Error('User already exists');
        }
        users.push(user);
        
        // Create initial data slot for this user
        db[`data_${user.id}`] = { 
            ...DB_TEMPLATE.appDataTemplate, 
            user: { name: user.name } 
        };
        
        StorageService.saveDB(db);
        return user;
    },

    loginUser: (email: string, pass: string) => {
        const users = StorageService.getUsers();
        const user = users.find((u: any) => u.email === email && u.password === pass);
        if (user) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(user));
            return user;
        }
        return null;
    },

    logout: () => {
        localStorage.removeItem(SESSION_KEY);
    },

    getSession: () => {
        const sess = localStorage.getItem(SESSION_KEY);
        return sess ? JSON.parse(sess) : null;
    },

    // Data Management
    getUserData: (userId: string): AppData => {
        const db = StorageService.getDB();
        const data = db[`data_${userId}`];
        // Fallback if user data is missing but user exists
        return data || { ...DB_TEMPLATE.appDataTemplate, user: { name: 'User' } };
    },

    saveUserData: (userId: string, data: AppData) => {
        const db = StorageService.getDB();
        db[`data_${userId}`] = data;
        StorageService.saveDB(db);
    }
};

// Initialize immediately
StorageService.init();