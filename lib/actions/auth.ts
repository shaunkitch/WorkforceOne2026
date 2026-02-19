'use server'

import { signUpSchema, SignUpSchema } from '@/lib/validations/auth';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/mail';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export interface FormState {
  errors?: {
    email?: string[];
    password?: string[];
    fullName?: string[];
    orgName?: string[];
    _form?: string[];
  };
  message?: string;
}

export async function signUp(
  prevState: FormState,
  formData: FormData
) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const orgName = formData.get('orgName') as string;

  const validatedFields = signUpSchema.safeParse({ email, password, fullName, orgName });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const adminSupabase = createAdminClient();
  console.log('SignUp attempt for:', email);

  // 1. Create User via Admin Client (Verified immediately to bypass rate limits/wait)
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    }
  });

  if (authError) {
    console.error('Auth signUp error:', authError);
    return {
      errors: {
        email: [authError.message],
      },
    };
  }

  const user = authData.user;
  console.log('Auth user created via Admin:', user?.id);

  if (!user) {
    return {
      errors: {
        email: ['User could not be created. Please try again.'],
      },
    };
  }

  // 2. Create Organization, Profile, and Organization Member
  try {
    // Create new organization
    const { data: orgData, error: orgError } = await adminSupabase
      .from('organizations')
      .insert({ name: orgName, created_by_user_id: user.id })
      .select('id')
      .single();

    if (orgError) throw orgError;
    const organizationId = orgData.id;

    // Link user to organization as owner
    const { error: memberError } = await adminSupabase
      .from('organization_members')
      .insert({ organization_id: organizationId, user_id: user.id, role: 'owner' });

    if (memberError) {
      console.error('Member link error:', memberError);
      throw memberError;
    }

    console.log('SignUp process completed successfully for user:', user.id);

    // 3. Send Welcome Email with credentials
    await sendWelcomeEmail(email, fullName, password);

  } catch (dbError: any) {
    console.error('Database operation failed during signup:', dbError);
    return {
      errors: {
        _form: [dbError.message || 'An unexpected error occurred during setup. Please try again.'],
      },
    };
  }

  redirect('/login?message=Account created successfully. You can now log in.');
}
