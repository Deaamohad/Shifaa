<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\MedicalRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MedicalRecordController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = MedicalRecord::query();
        if ($user->role === 'patient') {
            $query->where('patient_id', $user->id);
        } elseif ($user->role === 'doctor') {
            $query->where('doctor_id', $user->id);
        } else {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json([
            'medical_records' => $query->latest()->get(),
        ]);
    }

    public function show(Request $request, MedicalRecord $medicalRecord): JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'patient' && $medicalRecord->patient_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($user->role === 'doctor' && $medicalRecord->doctor_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json([
            'medical_record' => $medicalRecord,
        ]);
    }

    public function store(Request $request, Appointment $appointment): JsonResponse
    {
        $doctor = $request->user();

        if ($appointment->doctor_id !== $doctor->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($appointment->status !== 'completed') {
            return response()->json(['message' => 'Medical record can be created only after appointment is completed.'], 422);
        }

        $validated = $request->validate([
            'symptoms' => ['nullable', 'string'],
            'diagnosis' => ['nullable', 'string'],
            'prescription' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        $existing = $appointment->medicalRecord;
        if ($existing) {
            $existing->fill($validated);
            $existing->save();

            return response()->json([
                'message' => 'Medical record updated successfully.',
                'medical_record' => $existing,
            ]);
        }

        $medicalRecord = MedicalRecord::create([
            'appointment_id' => $appointment->id,
            'patient_id' => $appointment->patient_id,
            'doctor_id' => $appointment->doctor_id,
            'symptoms' => $validated['symptoms'] ?? null,
            'diagnosis' => $validated['diagnosis'] ?? null,
            'prescription' => $validated['prescription'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Medical record created successfully.',
            'medical_record' => $medicalRecord,
        ], 201);
    }
}

