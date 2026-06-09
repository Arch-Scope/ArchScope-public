'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    async function handleReset() {
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (!/[a-z]/.test(password)) {
            setError('Must contain lowercase letter');
            return;
        }
        if (!/[A-Z]/.test(password)) {
            setError('Must contain uppercase letter');
            return;
        }
        if (!/[0-9]/.test(password)) {
            setError('Must contain a number');
            return;
        }
        if (!/[^A-Za-z0-9]/.test(password)) {
            setError('Must contain special character');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reset-password',
                    token,
                    newPassword: password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to reset password');
            } else {
                setSuccess(data.message || 'Password reset successfully');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    }

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                    <h2 className="text-xl font-semibold text-red-600 mb-4">Invalid Link</h2>
                    <p className="text-gray-600 mb-6">The password reset link is invalid or missing required parameters.</p>
                    <Button onClick={() => router.push('/')} className="w-full">Back to Home</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full space-y-6">
                <h2 className="text-2xl font-bold text-center text-gray-800">Reset Password</h2>
                <p className="text-sm text-center text-gray-500">Enter your new password below.</p>
                
                {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>}
                
                {success ? (
                    <div className="space-y-4">
                        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">{success}</div>
                        <Button onClick={() => router.push('/')} className="w-full">Back to Home</Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Input
                            type="password"
                            placeholder="New Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Input
                            type="password"
                            placeholder="Confirm New Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <Button 
                            onClick={handleReset} 
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? 'Resetting...' : 'Confirm Reset'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
