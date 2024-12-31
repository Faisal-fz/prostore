'use server'

import { signIn, signOut } from "@/auth"
import { signInFormSchema } from "../validator"
import { isRedirectError } from "next/dist/client/components/redirect-error"

export async function signInWithCredentials(prevState: unknown, formData: FormData) {
    try {
        const user = signInFormSchema.parse({
            email: formData.get('email'),
            password: formData.get('password'),
        })
        await signIn('credentials', user)
        return {success: true, message: 'signed in successfully'}
    } catch (error) {
        if(isRedirectError(error)){
            throw error;
        }
        return {
            success: false,
            message: 'Inavlid email or password'
        }
        
    }
}
export async function signOutUser() {
    await signOut()
}