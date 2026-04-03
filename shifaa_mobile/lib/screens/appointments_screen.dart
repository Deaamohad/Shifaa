import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen> {
  List<dynamic> _appointments = [];
  List<dynamic> _doctors = [];
  // appointmentId → medical record map (doctors only)
  Map<int, Map<String, dynamic>> _recordByAppt = {};
  bool _loading = true;
  String? _error;
  final Set<int> _busy = {};
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final auth = context.read<AuthService>();
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final ap = await auth.dio.get<Map<String, dynamic>>('/appointments');
      _appointments = List<dynamic>.from(ap.data?['appointments'] as List? ?? []);
      if (auth.role == 'patient') {
        final d = await auth.dio.get<Map<String, dynamic>>('/doctors');
        _doctors = List<dynamic>.from(d.data?['doctors'] as List? ?? []);
      }
      if (auth.role == 'doctor') {
        final mr = await auth.dio.get<Map<String, dynamic>>('/medical-records');
        final list = List<dynamic>.from(mr.data?['medical_records'] as List? ?? []);
        _recordByAppt = {
          for (final r in list)
            if (r is Map<String, dynamic>)
              (int.tryParse(r['appointment_id']?.toString() ?? '') ?? -1): r,
        };
      }
    } on DioException catch (e) {
      _error = e.response?.data?.toString() ?? e.message ?? 'Failed to load';
      _appointments = [];
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) {
      setState(() => _loading = false);
    }
  }

  Future<void> _action(int id, String endpoint, String errorFallback) async {
    if (_busy.contains(id)) return;
    setState(() => _busy.add(id));
    final auth = context.read<AuthService>();
    try {
      await auth.dio.patch(endpoint);
      await _load();
    } on DioException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(
            e.response?.data is Map
                ? (e.response!.data as Map)['message']?.toString() ?? errorFallback
                : errorFallback,
          )),
        );
      }
    } finally {
      if (mounted) setState(() => _busy.remove(id));
    }
  }

  void _cancel(int id) => _action(id, '/appointments/$id/cancel', 'Cancel failed');
  void _confirm(int id) => _action(id, '/appointments/$id/confirm', 'Confirm failed');
  void _complete(int id) => _action(id, '/appointments/$id/complete', 'Complete failed');

  Future<void> _openNotesDialog(int apptId, Map<String, dynamic>? existing) async {
    final symptomsCtrl =
        TextEditingController(text: existing?['symptoms']?.toString() ?? '');
    final diagnosisCtrl =
        TextEditingController(text: existing?['diagnosis']?.toString() ?? '');
    final prescriptionCtrl =
        TextEditingController(text: existing?['prescription']?.toString() ?? '');
    final notesCtrl =
        TextEditingController(text: existing?['notes']?.toString() ?? '');

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (sheetCtx) {
        var saving = false;
        return StatefulBuilder(
          builder: (ctx, setLocal) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      existing != null ? 'Edit visit notes' : 'Add visit notes',
                      style: Theme.of(ctx).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 20),
                    _notesField(symptomsCtrl, 'Symptoms'),
                    const SizedBox(height: 12),
                    _notesField(diagnosisCtrl, 'Diagnosis'),
                    const SizedBox(height: 12),
                    _notesField(prescriptionCtrl, 'Prescription'),
                    const SizedBox(height: 12),
                    _notesField(notesCtrl, 'Additional notes'),
                    const SizedBox(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed:
                              saving ? null : () => Navigator.pop(sheetCtx),
                          child: const Text('Discard'),
                        ),
                        const SizedBox(width: 8),
                        FilledButton(
                          style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFF0F766E)),
                          onPressed: saving
                              ? null
                              : () async {
                                  setLocal(() => saving = true);
                                  final auth = context.read<AuthService>();
                                  try {
                                    await auth.dio.post(
                                      '/appointments/$apptId/medical-records',
                                      data: {
                                        'symptoms': symptomsCtrl.text.trim(),
                                        'diagnosis': diagnosisCtrl.text.trim(),
                                        'prescription':
                                            prescriptionCtrl.text.trim(),
                                        'notes': notesCtrl.text.trim(),
                                      },
                                    );
                                    if (sheetCtx.mounted) {
                                      Navigator.pop(sheetCtx);
                                    }
                                    await _load();
                                  } on DioException catch (e) {
                                    final msg = e.response?.data is Map
                                        ? (e.response!.data as Map)['message']
                                                ?.toString() ??
                                            'Save failed'
                                        : 'Save failed';
                                    if (ctx.mounted) {
                                      ScaffoldMessenger.of(ctx)
                                          .showSnackBar(SnackBar(
                                              content: Text(msg)));
                                    }
                                  } finally {
                                    if (ctx.mounted) {
                                      setLocal(() => saving = false);
                                    }
                                  }
                                },
                          child: saving
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2, color: Colors.white),
                                )
                              : const Text('Save'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    symptomsCtrl.dispose();
    diagnosisCtrl.dispose();
    prescriptionCtrl.dispose();
    notesCtrl.dispose();
  }

  Widget _notesField(TextEditingController ctrl, String label) =>
      TextField(
        controller: ctrl,
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
          alignLabelWithHint: true,
        ),
        maxLines: 3,
        minLines: 1,
        textCapitalization: TextCapitalization.sentences,
      );

  Future<void> _openBookDialog() async {
    if (_doctors.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No doctors available')),
      );
      return;
    }
    final first = _doctors.first as Map<String, dynamic>;
    int? doctorId = int.tryParse(first['id']?.toString() ?? '');
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (time == null || !mounted) return;
    final scheduled = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );
    final notesController = TextEditingController();

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        var saving = false;
        return StatefulBuilder(
          builder: (context, setLocal) {
            return AlertDialog(
              title: const Text('Book appointment'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    DropdownButtonFormField<int>(
                      key: ValueKey<int?>(doctorId),
                      initialValue: doctorId,
                      decoration: const InputDecoration(labelText: 'Doctor'),
                      items: _doctors.map((raw) {
                        final m = raw as Map<String, dynamic>;
                        final name = m['name'] as String? ?? 'Doctor';
                        final spec = (m['doctor_profile'] ?? m['doctorProfile'])
                            as Map<String, dynamic>?;
                        final s = spec?['specialization'] as String?;
                        return DropdownMenuItem<int>(
                          value: int.tryParse(m['id']?.toString() ?? '') ?? 0,
                          child: Text(s != null ? '$name · $s' : name),
                        );
                      }).toList(),
                      onChanged: saving ? null : (v) => setLocal(() => doctorId = v),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      DateFormat.yMMMd().add_jm().format(scheduled),
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: notesController,
                      decoration: const InputDecoration(
                        labelText: 'Notes (optional)',
                        border: OutlineInputBorder(),
                      ),
                      maxLines: 2,
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: saving ? null : () => Navigator.pop(dialogContext),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: saving || doctorId == null
                      ? null
                      : () async {
                          setLocal(() => saving = true);
                          final auth = context.read<AuthService>();
                          try {
                            await auth.dio.post(
                              '/appointments',
                              data: {
                                'doctor_id': doctorId,
                                'scheduled_at': scheduled.toUtc().toIso8601String(),
                                if (notesController.text.trim().isNotEmpty)
                                  'notes': notesController.text.trim(),
                              },
                            );
                            if (dialogContext.mounted) {
                              Navigator.pop(dialogContext);
                            }
                            await _load();
                          } on DioException catch (e) {
                            final msg =
                                e.response?.data is Map<String, dynamic> &&
                                        (e.response!.data as Map)['message'] != null
                                    ? (e.response!.data as Map)['message'].toString()
                                    : 'Booking failed';
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(msg)),
                              );
                            }
                          } finally {
                            if (context.mounted) {
                              setLocal(() => saving = false);
                            }
                          }
                        },
                  child: saving
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Book'),
                ),
              ],
            );
          },
        );
      },
    );
    notesController.dispose();
  }

  String _name(dynamic rel, String fallbackId) {
    if (rel is Map && rel['name'] != null) return rel['name'] as String;
    return fallbackId;
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final role = auth.role ?? '';
    final isPatient = role == 'patient';
    final isDoctor = role == 'doctor';
    final isStaff = role == 'receptionist' || role == 'admin';

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(onPressed: _load, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (isPatient)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: FilledButton.icon(
                onPressed: _openBookDialog,
                icon: const Icon(Icons.add),
                label: const Text('Book appointment'),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF0F766E),
                ),
              ),
            ),
          if (_appointments.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Text('No appointments yet.', textAlign: TextAlign.center),
            )
          else
            ..._appointments.map((raw) {
              final a = raw as Map<String, dynamic>;
              final id = int.tryParse(a['id']?.toString() ?? '') ?? 0;
              final status = a['status'] as String? ?? '';
              final when = a['scheduled_at'] != null
                  ? DateFormat.yMMMd().add_jm().format(
                      DateTime.parse(a['scheduled_at'].toString()).toLocal())
                  : '—';
              final patientName = _name(a['patient'], '#${a['patient_id']}');
              final doctorName = _name(a['doctor'], '#${a['doctor_id']}');
              final isBusy = _busy.contains(id);
              final cancellable = status == 'pending' || status == 'confirmed';

              Widget? trailing;

              final existingRecord = _recordByAppt[id];

              if (isBusy) {
                trailing = const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                );
              } else if (isDoctor && status == 'completed') {
                trailing = TextButton(
                  onPressed: () => _openNotesDialog(id, existingRecord),
                  child: Text(existingRecord != null ? 'Edit notes' : 'Add notes'),
                );
              } else if (isStaff) {
                final actions = <PopupMenuEntry<String>>[];
                if (status == 'pending') {
                  actions.add(const PopupMenuItem(
                      value: 'confirm', child: Text('Confirm')));
                }
                if (status == 'confirmed') {
                  actions.add(const PopupMenuItem(
                      value: 'complete', child: Text('Complete')));
                }
                if (cancellable) {
                  actions.add(const PopupMenuItem(
                      value: 'cancel',
                      child: Text('Cancel',
                          style: TextStyle(color: Colors.red))));
                }
                if (actions.isNotEmpty) {
                  trailing = PopupMenuButton<String>(
                    onSelected: (v) {
                      if (v == 'confirm') _confirm(id);
                      if (v == 'complete') _complete(id);
                      if (v == 'cancel') _cancel(id);
                    },
                    itemBuilder: (_) => actions,
                  );
                }
              } else if ((isPatient || isDoctor) && cancellable) {
                trailing = TextButton(
                  onPressed: () => _cancel(id),
                  child: const Text('Cancel'),
                );
              }

              Color? statusColor;
              if (status == 'confirmed') statusColor = Colors.blue.shade700;
              if (status == 'completed') statusColor = Colors.green.shade700;
              if (status == 'cancelled') statusColor = Colors.red.shade400;

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  title: Text(
                    isPatient ? doctorName : '$patientName → $doctorName',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Row(
                    children: [
                      Expanded(child: Text(when)),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: (statusColor ?? Colors.grey.shade600)
                              .withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: statusColor ?? Colors.grey.shade400),
                        ),
                        child: Text(
                          status.toUpperCase(),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: statusColor ?? Colors.grey.shade700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  trailing: trailing,
                ),
              );
            }),
        ],
      ),
    );
  }
}
