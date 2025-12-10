import { supabase } from './supabaseClient';

// Helper to convert Base64 DataURL to Blob for upload
export const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const match = arr[0].match(/:(.*?);/);
    const mime = match ? match[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

export const uploadFile = async (file: Blob | File, userId: string, bucket: string = 'images'): Promise<string> => {
    // Create a clean file path: userId / timestamp_random.jpg
    // Ensure extension exists
    let fileExt = 'jpeg';
    if (file.type) {
        const parts = file.type.split('/');
        if (parts.length > 1) fileExt = parts[1];
    }
    
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // Upload to Supabase Storage Bucket
    const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

    if (error) {
        console.error("Storage Upload Error:", error);
        
        // Detect RLS (Permission) Policy Error
        if (error.message.includes('row-level security') || (error as any).statusCode === '403') {
            throw new Error("RLS_POLICY_ERROR");
        }
        
        throw error;
    }

    // Get Public URL
    const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

    return data.publicUrl;
};