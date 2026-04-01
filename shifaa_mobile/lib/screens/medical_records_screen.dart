import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';

class MedicalRecordsScreen extends StatefulWidget {
  const MedicalRecordsScreen({super.key});

  @override
  State<MedicalRecordsScreen> createState() => _MedicalRecordsScreenState();
}

class _MedicalRecordsScreenState extends State<MedicalRecordsScreen> {
  List<dynamic> _records = [];
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
      final res = await auth.dio.get<Map<String, dynamic>>('/medical-records');
      _records = List<dynamic>.from(res.data?['medical_records'] as List? ?? []);
    } on DioException catch (e) {
      _error = e.response?.data is Map
          ? (e.response!.data as Map)['message']?.toString() ?? 'Failed to load'
          : e.message ?? 'Failed to load';
      _records = [];
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) setState(() => _loading = false);
  }

  void _showDetail(Map<String, dynamic> record) {
    final patient = record['patient'] as Map?;
    final doctor = record['doctor'] as Map?;
    final appt = record['appointment'] as Map?;
    final visitDate = appt?['scheduled_at'] != null
        ? DateFormat.yMMMd().add_jm().format(
            DateTime.parse(appt!['scheduled_at'].toString()).toLocal())
        : '—';

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) {
        return DraggableScrollableSheet(
          initialChildSize: 0.7,
          maxChildSize: 0.95,
          minChildSize: 0.4,
          expand: false,
          builder: (_, controller) {
            return Padding(
              padding: const EdgeInsets.all(20),
              child: ListView(
                controller: controller,
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
                    'Medical record',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${patient?['name'] ?? 'Patient'} · ${doctor?['name'] ?? 'Doctor'}',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                  Text(
                    'Visit: $visitDate',
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                  ),
                  const SizedBox(height: 20),
                  _section(context, 'Symptoms', record['symptoms']),
                  _section(context, 'Diagnosis', record['diagnosis']),
                  _section(context, 'Prescription', record['prescription']),
                  _section(context, 'Notes', record['notes']),
                  const SizedBox(height: 32),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _section(BuildContext context, String title, dynamic value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade500,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value?.toString().trim().isNotEmpty == true
                ? value.toString().trim()
                : '—',
            style: const TextStyle(fontSize: 15),
          ),
        ],
      ),
    );
  }

  String _personName(dynamic rel, String fallbackKey, Map<String, dynamic> record) {
    if (rel is Map && rel['name'] != null) return rel['name'] as String;
    final id = record[fallbackKey];
    return id != null ? '#$id' : '—';
  }

  @override
  Widget build(BuildContext context) {
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
      child: _records.isEmpty
          ? const Center(
              child: Text('No medical records yet.'),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _records.length,
              separatorBuilder: (context, index) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final r = _records[i] as Map<String, dynamic>;
                final appt = r['appointment'] as Map?;
                final visitDate = appt?['scheduled_at'] != null
                    ? DateFormat.yMMMd().format(
                        DateTime.parse(appt!['scheduled_at'].toString()).toLocal())
                    : '—';
                final patient = _personName(r['patient'], 'patient_id', r);
                final doctor = _personName(r['doctor'], 'doctor_id', r);
                final diagnosis = r['diagnosis']?.toString().trim() ?? '';

                return Card(
                  child: ListTile(
                    title: Text('$patient · $doctor'),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(visitDate),
                        if (diagnosis.isNotEmpty)
                          Text(
                            diagnosis.length > 80
                                ? '${diagnosis.substring(0, 80)}…'
                                : diagnosis,
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                      ],
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => _showDetail(r),
                  ),
                );
              },
            ),
    );
  }
}
