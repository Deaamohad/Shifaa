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
  bool _loading = true;
  String? _error;
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

  Future<void> _cancel(int id) async {
    final auth = context.read<AuthService>();
    try {
      await auth.dio.patch('/appointments/$id/cancel');
      await _load();
    } on DioException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.response?.data['message']?.toString() ?? 'Cancel failed')),
        );
      }
    }
  }

  Future<void> _openBookDialog() async {
    if (_doctors.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No doctors available')),
      );
      return;
    }
    final first = _doctors.first as Map<String, dynamic>;
    int? doctorId = (first['id'] as num).toInt();
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
                          value: (m['id'] as num).toInt(),
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
    final isPatient = auth.role == 'patient';

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
              final id = a['id'] as int;
              final status = a['status'] as String? ?? '';
              final when = a['scheduled_at'] != null
                  ? DateFormat.yMMMd().add_jm().format(DateTime.parse(a['scheduled_at'].toString()).toLocal())
                  : '—';
              final patient = _name(a['patient'], '#${a['patient_id']}');
              final doctor = _name(a['doctor'], '#${a['doctor_id']}');
              final canCancel = isPatient && (status == 'pending' || status == 'confirmed');

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  title: Text(
                    isPatient ? doctor : '$patient → $doctor',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Text('$when · ${status.toUpperCase()}'),
                  trailing: canCancel
                      ? TextButton(
                          onPressed: () => _cancel(id),
                          child: const Text('Cancel'),
                        )
                      : null,
                ),
              );
            }),
        ],
      ),
    );
  }
}
