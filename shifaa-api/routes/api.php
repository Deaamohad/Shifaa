<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AllergyController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\DoctorController;
use App\Http\Controllers\Api\LabResultController;
use App\Http\Controllers\Api\MedicalRecordController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\StaffController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/doctors', [DoctorController::class, 'index']);

    Route::get('/appointments', [AppointmentController::class, 'index']);
    Route::get('/appointments/{appointment}', [AppointmentController::class, 'show']);

    Route::middleware('role:patient')->post('/appointments', [AppointmentController::class, 'store']);
    Route::middleware('role:receptionist')->patch('/appointments/{appointment}/confirm', [AppointmentController::class, 'confirm']);
    Route::middleware('role:receptionist')->patch('/appointments/{appointment}/complete', [AppointmentController::class, 'complete']);
    Route::middleware('role:patient,doctor,receptionist')->patch('/appointments/{appointment}/cancel', [AppointmentController::class, 'cancel']);

    Route::middleware('role:patient,doctor,admin')->get('/medical-records', [MedicalRecordController::class, 'index']);
    Route::middleware('role:patient,doctor,admin')->get('/medical-records/{medicalRecord}', [MedicalRecordController::class, 'show']);
    Route::middleware('role:doctor')->post('/appointments/{appointment}/medical-records', [MedicalRecordController::class, 'store']);
    Route::middleware('role:doctor,admin')->get('/patients/{patient}/allergies', [AllergyController::class, 'index']);
    Route::middleware('role:doctor')->post('/patients/{patient}/allergies', [AllergyController::class, 'store']);

    Route::middleware('role:doctor,receptionist')->post('/lab-results', [LabResultController::class, 'store']);
    Route::middleware('role:doctor,patient,admin,receptionist')->get('/lab-results', [LabResultController::class, 'index']);
    Route::middleware('role:doctor,patient,admin,receptionist')->get('/lab-results/{labResult}', [LabResultController::class, 'show']);

    Route::middleware('role:receptionist')->post('/appointments/{appointment}/invoices', [InvoiceController::class, 'store']);
    Route::middleware('role:admin,receptionist,patient')->get('/invoices', [InvoiceController::class, 'index']);
    Route::middleware('role:admin,receptionist,patient')->get('/invoices/{invoice}', [InvoiceController::class, 'show']);
    Route::middleware('role:receptionist')->patch('/invoices/{invoice}/mark-paid', [InvoiceController::class, 'markPaid']);

    Route::middleware('role:admin')->get('/staff', [StaffController::class, 'index']);
    Route::middleware('role:admin')->post('/staff', [StaffController::class, 'store']);
    Route::middleware('role:admin')->put('/staff/{user}', [StaffController::class, 'update']);
});
