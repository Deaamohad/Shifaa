<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PatientAllergy;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AllergyController extends Controller
{
    public function index(User $patient): JsonResponse
    {
        if ($patient->role !== 'patient') {
            return response()->json(['message' => 'Invalid patient.'], 422);
        }

        $allergies = PatientAllergy::query()
            ->where('patient_id', $patient->id)
            ->latest()
            ->get();

        return response()->json([
            'allergies' => $allergies,
        ]);
    }

    public function store(Request $request, User $patient): JsonResponse
    {
        if ($patient->role !== 'patient') {
            return response()->json(['message' => 'Invalid patient.'], 422);
        }

        $validated = $request->validate([
            'allergy' => ['required', 'string'],
            'severity' => ['nullable', 'in:mild,moderate,severe'],
        ]);

        $allergy = PatientAllergy::create([
            'patient_id' => $patient->id,
            'allergy' => $validated['allergy'],
            'severity' => $validated['severity'] ?? null,
        ]);

        return response()->json([
            'message' => 'Allergy added successfully.',
            'allergy' => $allergy,
        ], 201);
    }
}

