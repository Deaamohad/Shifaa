import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';

class InvoicesScreen extends StatefulWidget {
  const InvoicesScreen({super.key});

  @override
  State<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends State<InvoicesScreen> {
  List<dynamic> _invoices = [];
  bool _loading = true;
  String? _error;
  int? _markingId;

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
      final res = await auth.dio.get<Map<String, dynamic>>('/invoices');
      _invoices = List<dynamic>.from(res.data?['invoices'] as List? ?? []);
    } on DioException catch (e) {
      _error = e.response?.data is Map
          ? (e.response!.data as Map)['message']?.toString() ?? 'Failed to load'
          : e.message ?? 'Failed to load';
      _invoices = [];
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _markPaid(int id) async {
    final auth = context.read<AuthService>();
    setState(() => _markingId = id);
    try {
      await auth.dio.patch('/invoices/$id/mark-paid');
      await _load();
    } on DioException catch (e) {
      if (mounted) {
        final msg = e.response?.data is Map
            ? (e.response!.data as Map)['message']?.toString() ?? 'Failed'
            : 'Failed to mark paid';
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(msg)));
      }
    } finally {
      if (mounted) setState(() => _markingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final isReceptionist = auth.role == 'receptionist';

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
      child: _invoices.isEmpty
          ? const Center(child: Text('No invoices yet.'))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _invoices.length,
              separatorBuilder: (context, index) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final inv = _invoices[i] as Map<String, dynamic>;
                final id = int.tryParse(inv['id']?.toString() ?? '') ?? 0;
                final paid = inv['is_paid'] == true || inv['is_paid'] == 1;
                final amount =
                    double.tryParse(inv['amount']?.toString() ?? '') ?? 0.0;
                final patient = inv['patient'] as Map?;
                final patientName = patient?['name']?.toString() ?? '#${inv['patient_id']}';
                final service = inv['service_description']?.toString() ?? '';
                final paidAt = paid && inv['paid_at'] != null
                    ? DateFormat.yMMMd().format(
                        DateTime.parse(inv['paid_at'].toString()).toLocal())
                    : null;

                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                patientName,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600, fontSize: 15),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: paid
                                    ? Colors.green.shade50
                                    : Colors.amber.shade50,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: paid
                                      ? Colors.green.shade200
                                      : Colors.amber.shade200,
                                ),
                              ),
                              child: Text(
                                paid ? 'Paid' : 'Unpaid',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: paid
                                      ? Colors.green.shade800
                                      : Colors.amber.shade900,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          service.length > 100
                              ? '${service.substring(0, 100)}…'
                              : service,
                          style: TextStyle(
                              color: Colors.grey.shade600, fontSize: 13),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Text(
                              NumberFormat.currency(symbol: '\$')
                                  .format(amount),
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700, fontSize: 16),
                            ),
                            if (paidAt != null) ...[
                              const SizedBox(width: 8),
                              Text(
                                '· paid $paidAt',
                                style: TextStyle(
                                    color: Colors.grey.shade500, fontSize: 12),
                              ),
                            ],
                            const Spacer(),
                            if (isReceptionist && !paid)
                              FilledButton(
                                onPressed: _markingId == id
                                    ? null
                                    : () => _markPaid(id),
                                style: FilledButton.styleFrom(
                                  backgroundColor: const Color(0xFF0F766E),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 14, vertical: 8),
                                  textStyle: const TextStyle(fontSize: 13),
                                ),
                                child: _markingId == id
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: Colors.white),
                                      )
                                    : const Text('Mark paid'),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
