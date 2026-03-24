<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\LabResult;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LabResultController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = LabResult::query()->with(['patient', 'uploadedBy', 'appointment']);
        if ($user->role === 'patient') {
            $query->where('patient_id', $user->id);
        } elseif ($user->role === 'doctor') {
            $query->whereNotNull('appointment_id')->whereHas('appointment', function ($appointmentQuery) use ($user) {
                $appointmentQuery->where('doctor_id', $user->id);
            });
        } elseif ($user->role === 'receptionist') {
            $query->where('uploaded_by', $user->id);
        } elseif ($user->role === 'admin') {
            // all
        } else {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json([
            'lab_results' => $query->latest()->get(),
        ]);
    }

    public function show(Request $request, LabResult $labResult): JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'patient') {
            if ($labResult->patient_id !== $user->id) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        } elseif ($user->role === 'doctor') {
            if ($labResult->appointment_id === null || $labResult->appointment->doctor_id !== $user->id) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        } elseif ($user->role === 'receptionist') {
            if ($labResult->uploaded_by !== $user->id) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        } elseif ($user->role !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json([
            'lab_result' => $labResult->load(['patient', 'uploadedBy', 'appointment']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'appointment_id' => ['nullable', 'integer', 'exists:appointments,id'],
            'patient_id' => ['required_without:appointment_id', 'integer', 'exists:users,id'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png'],
        ]);

        if ($user->role === 'doctor' && empty($validated['appointment_id'])) {
            return response()->json(['message' => 'Appointment is required for doctor uploads.'], 403);
        }

        $appointment = null;
        if (!empty($validated['appointment_id'])) {
            $appointment = Appointment::findOrFail($validated['appointment_id']);
            if ($user->role === 'doctor' && $appointment->doctor_id !== $user->id) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        }

        $patientId = $appointment ? $appointment->patient_id : $validated['patient_id'];

        $uploadedFile = $request->file('file');
        $originalExtension = strtolower($uploadedFile->getClientOriginalExtension());
        $fileType = match ($originalExtension) {
            'jpeg', 'jpg' => 'jpg',
            'png' => 'png',
            'pdf' => 'pdf',
            default => null,
        };

        if ($fileType === null) {
            return response()->json(['message' => 'Invalid file type.'], 422);
        }

        $filename = Str::uuid()->toString() . '.' . $fileType;
        $filePath = Storage::disk('public')->putFileAs('lab-results', $uploadedFile, $filename);

        $labResult = LabResult::create([
            'patient_id' => $patientId,
            'uploaded_by' => $user->id,
            'appointment_id' => $appointment?->id,
            'title' => $validated['title'],
            'file_path' => $filePath,
            'file_type' => $fileType,
            'notification_sent' => true,
        ]);

        return response()->json([
            'message' => 'Lab result uploaded successfully.',
            'lab_result' => $labResult,
        ], 201);
    }
}

