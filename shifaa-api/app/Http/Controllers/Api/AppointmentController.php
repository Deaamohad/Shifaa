<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AppointmentController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'doctor_id' => ['required', 'integer', Rule::exists('users', 'id')->where('role', 'doctor')],
            'scheduled_at' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $patientId = $request->user()->id;
        $doctorId = $validated['doctor_id'];

        $appointment = Appointment::create([
            'patient_id' => $patientId,
            'doctor_id' => $doctorId,
            'scheduled_at' => $validated['scheduled_at'],
            'status' => 'pending',
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Appointment created successfully.',
            'appointment' => $appointment,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Appointment::query()->with([
            'patient:id,name,email,phone',
            'doctor:id,name,email,phone',
        ]);
        if ($user->role === 'patient') {
            $query->where('patient_id', $user->id);
        } elseif ($user->role === 'doctor') {
            $query->where('doctor_id', $user->id);
        }

        $appointments = $query->latest('scheduled_at')->get();

        return response()->json([
            'appointments' => $appointments,
        ]);
    }

    public function show(Request $request, Appointment $appointment): JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'patient' && $appointment->patient_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($user->role === 'doctor' && $appointment->doctor_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json([
            'appointment' => $appointment->load([
                'patient:id,name,email,phone',
                'doctor:id,name,email,phone',
            ]),
        ]);
    }

    public function confirm(Request $request, Appointment $appointment): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'receptionist') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($appointment->status !== 'pending') {
            return response()->json(['message' => 'Only pending appointments can be confirmed.'], 422);
        }

        $appointment->status = 'confirmed';
        $appointment->save();

        return response()->json([
            'message' => 'Appointment confirmed successfully.',
            'appointment' => $appointment,
        ]);
    }

    public function cancel(Request $request, Appointment $appointment): JsonResponse
    {
        $user = $request->user();

        if (!in_array($user->role, ['patient', 'doctor', 'receptionist'], true)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($appointment->status === 'cancelled' || $appointment->status === 'completed') {
            return response()->json(['message' => 'This appointment cannot be cancelled.'], 422);
        }

        $canCancelAsPatient = $user->role === 'patient' && $appointment->patient_id === $user->id;
        $canCancelAsDoctor = $user->role === 'doctor' && $appointment->doctor_id === $user->id;
        $canCancelAsReceptionist = $user->role === 'receptionist';
        if (!$canCancelAsPatient && !$canCancelAsDoctor && !$canCancelAsReceptionist) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $appointment->status = 'cancelled';
        $appointment->notes = $request->input('notes', $appointment->notes);
        $appointment->save();

        return response()->json([
            'message' => 'Appointment cancelled successfully.',
            'appointment' => $appointment,
        ]);
    }

    public function complete(Request $request, Appointment $appointment): JsonResponse
    {
        if ($request->user()->role !== 'receptionist') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($appointment->status !== 'confirmed') {
            return response()->json(['message' => 'Appointment cannot be completed.'], 422);
        }

        $appointment->status = 'completed';
        $appointment->save();

        return response()->json([
            'message' => 'Appointment completed successfully.',
            'appointment' => $appointment,
        ]);
    }

}

