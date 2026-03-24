<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Invoice::query()->with(['patient', 'appointment']);
        if ($user->role === 'patient') {
            $query->where('patient_id', $user->id);
        } elseif (!in_array($user->role, ['receptionist', 'admin'], true)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json([
            'invoices' => $query->latest()->get(),
        ]);
    }

    public function show(Request $request, Invoice $invoice): JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'patient') {
            if ($invoice->patient_id !== $user->id) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        } elseif (!in_array($user->role, ['receptionist', 'admin'], true)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json([
            'invoice' => $invoice->load(['patient', 'appointment']),
        ]);
    }

    public function store(Request $request, Appointment $appointment): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'service_description' => ['required', 'string'],
            'amount' => ['required', 'numeric', 'min:0'],
        ]);

        if ($appointment->status !== 'completed') {
            return response()->json(['message' => 'Invoice can be created only after appointment is completed.'], 422);
        }

        $invoice = Invoice::create([
            'appointment_id' => $appointment->id,
            'patient_id' => $appointment->patient_id,
            'receptionist_id' => $user->id,
            'service_description' => $validated['service_description'],
            'amount' => $validated['amount'],
            'is_paid' => false,
            'paid_at' => null,
        ]);

        return response()->json([
            'message' => 'Invoice created successfully.',
            'invoice' => $invoice,
        ], 201);
    }

    public function markPaid(Request $request, Invoice $invoice): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'receptionist') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($invoice->is_paid) {
            return response()->json(['message' => 'Invoice is already paid.'], 422);
        }

        $invoice->is_paid = true;
        $invoice->paid_at = now();
        $invoice->save();

        return response()->json([
            'message' => 'Invoice marked as paid successfully.',
            'invoice' => $invoice,
        ]);
    }
}

