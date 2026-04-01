import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
import 'appointments_screen.dart';
import 'invoices_screen.dart';
import 'lab_results_screen.dart';
import 'medical_records_screen.dart';

class MainShellScreen extends StatefulWidget {
  const MainShellScreen({super.key});

  @override
  State<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends State<MainShellScreen> {
  int _currentIndex = 0;

  // Each role gets its own tab config.
  List<_TabItem> _tabs(String role) {
    switch (role) {
      case 'patient':
        return [
          _TabItem(
            label: 'Appointments',
            icon: Icons.calendar_month_outlined,
            screen: const AppointmentsScreen(),
          ),
          _TabItem(
            label: 'Records',
            icon: Icons.folder_open_outlined,
            screen: const MedicalRecordsScreen(),
          ),
          _TabItem(
            label: 'Lab Results',
            icon: Icons.science_outlined,
            screen: const LabResultsScreen(),
          ),
          _TabItem(
            label: 'Invoices',
            icon: Icons.receipt_long_outlined,
            screen: const InvoicesScreen(),
          ),
        ];
      case 'doctor':
        return [
          _TabItem(
            label: 'Schedule',
            icon: Icons.calendar_today_outlined,
            screen: const AppointmentsScreen(),
          ),
          _TabItem(
            label: 'Records',
            icon: Icons.folder_open_outlined,
            screen: const MedicalRecordsScreen(),
          ),
          _TabItem(
            label: 'Lab Results',
            icon: Icons.science_outlined,
            screen: const LabResultsScreen(),
          ),
        ];
      case 'receptionist':
        return [
          _TabItem(
            label: 'Appointments',
            icon: Icons.calendar_month_outlined,
            screen: const AppointmentsScreen(),
          ),
          _TabItem(
            label: 'Lab Results',
            icon: Icons.science_outlined,
            screen: const LabResultsScreen(),
          ),
          _TabItem(
            label: 'Invoices',
            icon: Icons.receipt_long_outlined,
            screen: const InvoicesScreen(),
          ),
        ];
      case 'admin':
        return [
          _TabItem(
            label: 'Appointments',
            icon: Icons.calendar_month_outlined,
            screen: const AppointmentsScreen(),
          ),
          _TabItem(
            label: 'Records',
            icon: Icons.folder_open_outlined,
            screen: const MedicalRecordsScreen(),
          ),
          _TabItem(
            label: 'Lab Results',
            icon: Icons.science_outlined,
            screen: const LabResultsScreen(),
          ),
          _TabItem(
            label: 'Invoices',
            icon: Icons.receipt_long_outlined,
            screen: const InvoicesScreen(),
          ),
        ];
      default:
        return [
          _TabItem(
            label: 'Appointments',
            icon: Icons.calendar_month_outlined,
            screen: const AppointmentsScreen(),
          ),
        ];
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final role = auth.role ?? '';
    final tabs = _tabs(role);

    // Clamp index when tabs change on role switch (edge case).
    final safeIndex = _currentIndex.clamp(0, tabs.length - 1);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Shifaa'),
        backgroundColor: const Color(0xFF0F766E),
        foregroundColor: Colors.white,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    auth.user?['name']?.toString() ?? '',
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                  Text(
                    role,
                    style: const TextStyle(
                        fontSize: 11, color: Colors.white70),
                  ),
                ],
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Log out',
            onPressed: () => auth.logout(),
          ),
        ],
      ),
      body: tabs[safeIndex].screen,
      bottomNavigationBar: tabs.length > 1
          ? NavigationBar(
              selectedIndex: safeIndex,
              onDestinationSelected: (i) =>
                  setState(() => _currentIndex = i),
              indicatorColor: const Color(0xFF0F766E).withValues(alpha: 0.15),
              destinations: tabs
                  .map(
                    (t) => NavigationDestination(
                      icon: Icon(t.icon),
                      label: t.label,
                    ),
                  )
                  .toList(),
            )
          : null,
    );
  }
}

class _TabItem {
  const _TabItem({
    required this.label,
    required this.icon,
    required this.screen,
  });

  final String label;
  final IconData icon;
  final Widget screen;
}
