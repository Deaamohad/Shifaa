import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';

// ─── Main screen ─────────────────────────────────────────────────────────────

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen> {
  List<dynamic> _appointments = [];
  List<dynamic> _doctors = [];
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
    if (!mounted) return;
    final auth = context.read<AuthService>();
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final ap = await auth.dio.get<Map<String, dynamic>>('/appointments');
      if (!mounted) return;
      _appointments =
          List<dynamic>.from(ap.data?['appointments'] as List? ?? []);

      if (auth.role == 'patient') {
        final d = await auth.dio.get<Map<String, dynamic>>('/doctors');
        if (!mounted) return;
        _doctors = List<dynamic>.from(d.data?['doctors'] as List? ?? []);
      }

      if (auth.role == 'doctor') {
        final mr =
            await auth.dio.get<Map<String, dynamic>>('/medical-records');
        if (!mounted) return;
        final list = List<dynamic>.from(
            mr.data?['medical_records'] as List? ?? []);
        _recordByAppt = {
          for (final r in list)
            if (r is Map<String, dynamic>)
              (int.tryParse(r['appointment_id']?.toString() ?? '') ?? -1): r,
        };
      }
    } on DioException catch (e) {
      if (!mounted) return;
      _error =
          e.response?.data?.toString() ?? e.message ?? 'Failed to load';
      _appointments = [];
    } catch (e) {
      if (!mounted) return;
      _error = e.toString();
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _action(
      int id, String endpoint, String errorFallback) async {
    if (_busy.contains(id)) return;
    if (!mounted) return;
    setState(() => _busy.add(id));
    final auth = context.read<AuthService>();
    try {
      await auth.dio.patch(endpoint);
      await _load();
    } on DioException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.response?.data is Map
              ? (e.response!.data as Map)['message']?.toString() ??
                  errorFallback
              : errorFallback),
        ));
      }
    } finally {
      if (mounted) setState(() => _busy.remove(id));
    }
  }

  void _cancel(int id) =>
      _action(id, '/appointments/$id/cancel', 'Cancel failed');
  void _confirm(int id) =>
      _action(id, '/appointments/$id/confirm', 'Confirm failed');
  void _complete(int id) =>
      _action(id, '/appointments/$id/complete', 'Complete failed');

  Future<void> _openBookDialog() async {
    if (_doctors.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('No doctors available')));
      return;
    }

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
        date.year, date.month, date.day, time.hour, time.minute);

    final booked = await showDialog<bool>(
      context: context,
      builder: (_) => _BookingDialog(
        doctors: _doctors,
        scheduled: scheduled,
      ),
    );

    if (booked == true) await _load();
  }

  Future<void> _openNotesDialog(
      int apptId, Map<String, dynamic>? existing) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => _NotesSheet(
        apptId: apptId,
        existing: existing,
      ),
    );
    if (saved == true) await _load();
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

    if (_loading) return const Center(child: CircularProgressIndicator());

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
                    backgroundColor: const Color(0xFF0F766E)),
              ),
            ),
          if (_appointments.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Text('No appointments yet.',
                  textAlign: TextAlign.center),
            )
          else
            ..._appointments.map((raw) {
              final a = raw as Map<String, dynamic>;
              final id =
                  int.tryParse(a['id']?.toString() ?? '') ?? 0;
              final status = a['status'] as String? ?? '';
              final when = a['scheduled_at'] != null
                  ? DateFormat.yMMMd().add_jm().format(DateTime.parse(
                          a['scheduled_at'].toString())
                      .toLocal())
                  : '—';
              final patientName =
                  _name(a['patient'], '#${a['patient_id']}');
              final doctorName =
                  _name(a['doctor'], '#${a['doctor_id']}');
              final isBusy = _busy.contains(id);
              final cancellable =
                  status == 'pending' || status == 'confirmed';
              final existingRecord = _recordByAppt[id];

              Widget? trailing;
              if (isBusy) {
                trailing = const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                );
              } else if (isDoctor && status == 'completed') {
                trailing = TextButton(
                  onPressed: () =>
                      _openNotesDialog(id, existingRecord),
                  child: Text(existingRecord != null
                      ? 'Edit notes'
                      : 'Add notes'),
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

// ─── Booking dialog ───────────────────────────────────────────────────────────

class _BookingDialog extends StatefulWidget {
  const _BookingDialog({
    required this.doctors,
    required this.scheduled,
  });

  final List<dynamic> doctors;
  final DateTime scheduled;

  @override
  State<_BookingDialog> createState() => _BookingDialogState();
}

class _BookingDialogState extends State<_BookingDialog> {
  late int? _doctorId;
  final _notesCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final first = widget.doctors.first as Map<String, dynamic>;
    _doctorId = int.tryParse(first['id']?.toString() ?? '');
  }

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_doctorId == null || _saving) return;
    setState(() => _saving = true);
    final auth = context.read<AuthService>();
    try {
      await auth.dio.post('/appointments', data: {
        'doctor_id': _doctorId,
        'scheduled_at': widget.scheduled.toUtc().toIso8601String(),
        if (_notesCtrl.text.trim().isNotEmpty)
          'notes': _notesCtrl.text.trim(),
      });
      if (mounted) Navigator.pop(context, true);
    } on DioException catch (e) {
      if (!mounted) return;
      final msg = e.response?.data is Map
          ? (e.response!.data as Map)['message']?.toString() ??
              'Booking failed'
          : 'Booking failed';
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(msg)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Book appointment'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DropdownButtonFormField<int>(
              initialValue: _doctorId,
              decoration:
                  const InputDecoration(labelText: 'Doctor'),
              items: widget.doctors.map((raw) {
                final m = raw as Map<String, dynamic>;
                final name = m['name'] as String? ?? 'Doctor';
                final spec =
                    (m['doctor_profile'] ?? m['doctorProfile'])
                        as Map<String, dynamic>?;
                final s = spec?['specialization'] as String?;
                return DropdownMenuItem<int>(
                  value:
                      int.tryParse(m['id']?.toString() ?? '') ?? 0,
                  child: Text(s != null ? '$name · $s' : name),
                );
              }).toList(),
              onChanged: _saving
                  ? null
                  : (v) => setState(() => _doctorId = v),
            ),
            const SizedBox(height: 12),
            Text(
              DateFormat.yMMMd()
                  .add_jm()
                  .format(widget.scheduled),
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _notesCtrl,
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
          onPressed:
              _saving ? null : () => Navigator.pop(context, false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _saving || _doctorId == null ? null : _submit,
          style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF0F766E)),
          child: _saving
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white),
                )
              : const Text('Book'),
        ),
      ],
    );
  }
}

// ─── Notes bottom sheet ───────────────────────────────────────────────────────

class _NotesSheet extends StatefulWidget {
  const _NotesSheet({required this.apptId, this.existing});

  final int apptId;
  final Map<String, dynamic>? existing;

  @override
  State<_NotesSheet> createState() => _NotesSheetState();
}

class _NotesSheetState extends State<_NotesSheet> {
  late final TextEditingController _symptomsCtrl;
  late final TextEditingController _diagnosisCtrl;
  late final TextEditingController _prescriptionCtrl;
  late final TextEditingController _notesCtrl;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _symptomsCtrl =
        TextEditingController(text: e?['symptoms']?.toString() ?? '');
    _diagnosisCtrl =
        TextEditingController(text: e?['diagnosis']?.toString() ?? '');
    _prescriptionCtrl =
        TextEditingController(
            text: e?['prescription']?.toString() ?? '');
    _notesCtrl =
        TextEditingController(text: e?['notes']?.toString() ?? '');
  }

  @override
  void dispose() {
    _symptomsCtrl.dispose();
    _diagnosisCtrl.dispose();
    _prescriptionCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_saving) return;
    setState(() => _saving = true);
    final auth = context.read<AuthService>();
    try {
      await auth.dio.post(
        '/appointments/${widget.apptId}/medical-records',
        data: {
          'symptoms': _symptomsCtrl.text.trim(),
          'diagnosis': _diagnosisCtrl.text.trim(),
          'prescription': _prescriptionCtrl.text.trim(),
          'notes': _notesCtrl.text.trim(),
        },
      );
      if (mounted) Navigator.pop(context, true);
    } on DioException catch (e) {
      if (!mounted) return;
      final msg = e.response?.data is Map
          ? (e.response!.data as Map)['message']?.toString() ??
              'Save failed'
          : 'Save failed';
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(msg)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _field(TextEditingController ctrl, String label) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextField(
          controller: ctrl,
          decoration: InputDecoration(
            labelText: label,
            border: const OutlineInputBorder(),
            alignLabelWithHint: true,
          ),
          maxLines: 3,
          minLines: 1,
          textCapitalization: TextCapitalization.sentences,
        ),
      );

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
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
              widget.existing != null
                  ? 'Edit visit notes'
                  : 'Add visit notes',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 20),
            _field(_symptomsCtrl, 'Symptoms'),
            _field(_diagnosisCtrl, 'Diagnosis'),
            _field(_prescriptionCtrl, 'Prescription'),
            _field(_notesCtrl, 'Additional notes'),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: _saving
                      ? null
                      : () => Navigator.pop(context, false),
                  child: const Text('Discard'),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _saving ? null : _submit,
                  style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF0F766E)),
                  child: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white),
                        )
                      : const Text('Save'),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
