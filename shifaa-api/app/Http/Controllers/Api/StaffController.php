<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

class StaffController extends Controller
{
    public function index(): JsonResponse
    {
        $staff = User::query()
            ->whereIn('role', ['doctor', 'receptionist'])
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
            'role' => ['required', 'in:doctor,receptionist'],
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
        if (!in_array($user->role, ['doctor', 'receptionist'], true)) {
            return response()->json(['message' => 'Only staff users can be updated from this endpoint.'], 422);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $user->fill($validated);
        $user->save();

        return response()->json([
            'message' => 'Staff updated successfully.',
            'staff' => $user,
        ]);
    }
}

