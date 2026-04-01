import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';

class LabResultsScreen extends StatefulWidget {
  const LabResultsScreen({super.key});

  @override
  State<LabResultsScreen> createState() => _LabResultsScreenState();
}

class _LabResultsScreenState extends State<LabResultsScreen> {
  List<dynamic> _results = [];
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
      final res = await auth.dio.get<Map<String, dynamic>>('/lab-results');
      _results = List<dynamic>.from(res.data?['lab_results'] as List? ?? []);
    } on DioException catch (e) {
      _error = e.response?.data is Map
          ? (e.response!.data as Map)['message']?.toString() ?? 'Failed to load'
          : e.message ?? 'Failed to load';
      _results = [];
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) setState(() => _loading = false);
  }

  void _showDetail(Map<String, dynamic> r) {
    final patient = r['patient'] as Map?;
    final doctor = r['doctor'] as Map?;
    final uploadedAt = r['created_at'] != null
        ? DateFormat.yMMMd().add_jm().format(
            DateTime.parse(r['created_at'].toString()).toLocal())
        : '—';

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.55,
        maxChildSize: 0.9,
        minChildSize: 0.35,
        expand: false,
        builder: (_, controller) => Padding(
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
              Text('Lab Result',
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 4),
              Text(uploadedAt,
                  style: TextStyle(
                      color: Colors.grey.shade600, fontSize: 13)),
              const SizedBox(height: 20),
              _row('Patient', patient?['name']?.toString()),
              _row('Doctor', doctor?['name']?.toString()),
              _row('Test type', r['test_type']),
              _row('Result', r['result']),
              _row('Notes', r['notes']),
              if (r['file_path'] != null) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.attach_file,
                        size: 16, color: Colors.grey),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        r['file_path'].toString().split('/').last,
                        style: const TextStyle(
                            fontSize: 13, color: Colors.blueGrey),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _row(String label, dynamic value) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label.toUpperCase(),
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey.shade500,
                  letterSpacing: 0.8),
            ),
            const SizedBox(height: 3),
            Text(
              value?.toString().trim().isNotEmpty == true
                  ? value.toString().trim()
                  : '—',
              style: const TextStyle(fontSize: 15),
            ),
          ],
        ),
      );

  @override
  Widget build(BuildContext context) {
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
      child: _results.isEmpty
          ? const Center(child: Text('No lab results yet.'))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _results.length,
              separatorBuilder: (context, index) =>
                  const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final r = _results[i] as Map<String, dynamic>;
                final patient = r['patient'] as Map?;
                final patientName =
                    patient?['name']?.toString() ?? '#${r['patient_id']}';
                final testType =
                    r['test_type']?.toString().trim() ?? 'Lab test';
                final hasFile = r['file_path'] != null;
                final date = r['created_at'] != null
                    ? DateFormat.yMMMd().format(
                        DateTime.parse(r['created_at'].toString()).toLocal())
                    : '—';

                return Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor:
                          const Color(0xFF0F766E).withValues(alpha: 0.1),
                      child: const Icon(Icons.science_outlined,
                          color: Color(0xFF0F766E)),
                    ),
                    title: Text(testType),
                    subtitle: Text('$patientName · $date'),
                    trailing: hasFile
                        ? const Icon(Icons.attach_file,
                            size: 18, color: Colors.grey)
                        : const Icon(Icons.chevron_right),
                    onTap: () => _showDetail(r),
                  ),
                );
              },
            ),
    );
  }
}
