<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DoctorController extends Controller
{
    public function index(): JsonResponse
    {
        $doctors = User::query()
            ->where('role', 'doctor')
            ->where('is_active', true)
            ->with('doctorProfile')
            ->get();

        return response()->json([
            'doctors' => $doctors,
        ]);
    }
}

