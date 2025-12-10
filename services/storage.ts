import { supabase } from './supabaseClient';
import { DB_TEMPLATE } from './dbTemplate';
import { AppData } from '../types';

export const StorageService = {
    // --- AUTHENTICATION ---
    
    // Check if user is logged in currently
    getSession: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    },

    // Sign Up
    signUp: async (email: string, pass: string, name: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password: pass,
            options: {
                data: { name } // Store name in metadata
            }
        });
        if (error) throw error;
        
        // If signup successful, initialize their DB entry
        if (data.user) {
            const initialData = { 
                ...DB_TEMPLATE.appDataTemplate, 
                user: { name } 
            };
            await StorageService.saveUserData(initialData);
        }
        
        return data;
    },

    // Log In
    login: async (email: string, pass: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: pass
        });
        if (error) throw error;
        return data;
    },

    // Log Out
    logout: async () => {
        await supabase.auth.signOut();
    },

    // --- DATA MANAGEMENT ---

    // Load ALL user data from Supabase table
    getUserData: async (): Promise<AppData | null> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('user_data')
            .select('content')
            .eq('id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found" (new user)
            console.error("Error loading data:", error);
            return null;
        }

        if (data && data.content) {
            return data.content as AppData;
        }

        // Return template if new user
        return { 
            ...DB_TEMPLATE.appDataTemplate, 
            user: { name: user.user_metadata.name || 'User' } 
        };
    },

    // Save ALL user data to Supabase table
    saveUserData: async (data: AppData) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Simple size check
        try {
            const payloadString = JSON.stringify(data);
            const sizeInMB = payloadString.length / 1024 / 1024;
            if (sizeInMB > 10) {
                console.warn(`⚠️ Warning: Data size is ${sizeInMB.toFixed(2)}MB. This might be too large for rapid syncing.`);
            }
        } catch(e) {}

        const { error } = await supabase
            .from('user_data')
            .upsert({ 
                id: user.id, 
                content: data,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error("Error saving data:", error);
            throw error; // Propagate error so UI shows "Error"
        }
    },

    // --- ADMIN FUNCTIONS ---
    // Note: These will only work if RLS is disabled OR a policy allows access
    
    getAllUsersData: async () => {
        const { data, error } = await supabase
            .from('user_data')
            .select('*');
        if (error) throw error;
        return data;
    },

    adminDeleteUserData: async (userId: string) => {
        const { error } = await supabase
            .from('user_data')
            .delete()
            .eq('id', userId);
        if (error) throw error;
    },

    adminUpdateUserData: async (userId: string, content: any) => {
        const { error } = await supabase
            .from('user_data')
            .update({ 
                content: content,
                updated_at: new Date().toISOString() 
            })
            .eq('id', userId);
        if (error) throw error;
    },

    // --- IMPORT / EXPORT ---
    exportDatabase: async () => {
        const data = await StorageService.getUserData();
        if (!data) return;
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `life_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    importDatabase: async (file: File) => {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const json = JSON.parse(e.target?.result as string);
                    // Basic validation
                    if (!json.user || !json.goals) throw new Error("Invalid structure");
                    
                    await StorageService.saveUserData(json);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
};