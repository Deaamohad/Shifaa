<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rules\Password;

class StaffController extends Controller
{
    public function index(): JsonResponse
    {
        $staff = User::query()
            ->whereIn('role', ['doctor', 'receptionist', 'admin'])
            ->with('doctorProfile')
            ->latest()
            ->get();

        return response()->json([
            'staff' => $staff,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'role' => ['required', 'in:doctor,receptionist,admin'],
            'phone' => ['nullable', 'string', 'max:20'],
            'specialization' => ['required_if:role,doctor', 'string', 'max:255'],
            'bio' => ['nullable', 'string'],
            'consultation_fee' => ['required_if:role,doctor', 'numeric', 'min:0'],
        ]);

        $staff = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => $validated['role'],
            'phone' => $validated['phone'] ?? null,
            'is_active' => true,
        ]);

        if ($staff->role === 'doctor') {
            $staff->doctorProfile()->create([
                'specialization' => $validated['specialization'],
                'bio' => $validated['bio'] ?? null,
                'consultation_fee' => $validated['consultation_fee'],
            ]);
            $staff->load('doctorProfile');
        }

        return response()->json([
            'message' => 'Staff account created successfully.',
            'staff' => $staff,
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'is_active' => ['sometimes', 'boolean'],
            'role' => ['sometimes', 'required', 'in:doctor,receptionist,admin'],
            'password' => ['sometimes', 'required', 'confirmed', Password::defaults()],
            'specialization' => ['sometimes', 'required', 'string', 'max:255'],
            'bio' => ['sometimes', 'nullable', 'string'],
            'consultation_fee' => ['sometimes', 'required', 'numeric', 'min:0'],
        ]);

        $targetRole = $validated['role'] ?? $user->role;
        $isPromotingToDoctor = $targetRole === 'doctor' && $user->role !== 'doctor';
        if ($isPromotingToDoctor) {
            if (empty($validated['specialization']) || !array_key_exists('consultation_fee', $validated)) {
                return response()->json([
                    'message' => 'specialization and consultation_fee are required when changing role to doctor.',
                ], 422);
            }
        }

        $user->fill(Arr::only($validated, ['name', 'phone', 'is_active', 'role', 'password']));
        $user->save();

        if ($targetRole === 'doctor') {
            $profileData = Arr::only($validated, ['specialization', 'bio', 'consultation_fee']);
            if (!empty($profileData)) {
                $user->doctorProfile()->updateOrCreate([], [
                    'specialization' => $profileData['specialization'] ?? $user->doctorProfile?->specialization ?? 'General',
                    'bio' => $profileData['bio'] ?? $user->doctorProfile?->bio,
                    'consultation_fee' => $profileData['consultation_fee'] ?? $user->doctorProfile?->consultation_fee ?? 0,
                ]);
            }
        }

        return response()->json([
            'message' => 'Staff updated successfully.',
            'staff' => $user->load('doctorProfile'),
        ]);
    }
}

