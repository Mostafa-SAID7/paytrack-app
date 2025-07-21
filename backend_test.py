#!/usr/bin/env python3
"""
PayTrack Backend API Testing Suite
Tests all core functionalities including employee management, payroll calculation, and analytics
"""

import requests
import json
import uuid
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://4fb24cdf-45ec-4964-89d5-592026c45881.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class PayTrackAPITester:
    def __init__(self):
        self.base_url = API_BASE
        self.test_employees = []
        self.test_payroll_records = []
        
    def log_test(self, test_name, success, message=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if message:
            print(f"    {message}")
        print()
    
    def test_api_root(self):
        """Test the root API endpoint"""
        try:
            response = requests.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                if "PayTrack API" in data.get("message", ""):
                    self.log_test("API Root Endpoint", True, f"Response: {data}")
                    return True
                else:
                    self.log_test("API Root Endpoint", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("API Root Endpoint", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("API Root Endpoint", False, f"Error: {str(e)}")
            return False
    
    def test_create_employee(self, employee_data):
        """Test creating a new employee"""
        try:
            response = requests.post(f"{self.base_url}/employees", json=employee_data)
            if response.status_code == 200:
                data = response.json()
                if data.get("id") and data.get("name") == employee_data["name"]:
                    self.test_employees.append(data)
                    self.log_test(f"Create Employee - {employee_data['name']}", True, 
                                f"Employee ID: {data['id']}")
                    return data
                else:
                    self.log_test(f"Create Employee - {employee_data['name']}", False, 
                                f"Invalid response: {data}")
                    return None
            else:
                self.log_test(f"Create Employee - {employee_data['name']}", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return None
        except Exception as e:
            self.log_test(f"Create Employee - {employee_data['name']}", False, f"Error: {str(e)}")
            return None
    
    def test_get_all_employees(self):
        """Test retrieving all employees"""
        try:
            response = requests.get(f"{self.base_url}/employees")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Get All Employees", True, f"Found {len(data)} employees")
                    return data
                else:
                    self.log_test("Get All Employees", False, f"Expected list, got: {type(data)}")
                    return None
            else:
                self.log_test("Get All Employees", False, f"Status: {response.status_code}")
                return None
        except Exception as e:
            self.log_test("Get All Employees", False, f"Error: {str(e)}")
            return None
    
    def test_get_employee_by_id(self, employee_id):
        """Test retrieving a specific employee by ID"""
        try:
            response = requests.get(f"{self.base_url}/employees/{employee_id}")
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == employee_id:
                    self.log_test(f"Get Employee by ID - {employee_id}", True, 
                                f"Employee: {data.get('name')}")
                    return data
                else:
                    self.log_test(f"Get Employee by ID - {employee_id}", False, 
                                f"ID mismatch: {data}")
                    return None
            else:
                self.log_test(f"Get Employee by ID - {employee_id}", False, 
                            f"Status: {response.status_code}")
                return None
        except Exception as e:
            self.log_test(f"Get Employee by ID - {employee_id}", False, f"Error: {str(e)}")
            return None
    
    def test_payroll_calculation(self, employee_id, period):
        """Test the core payroll calculation functionality"""
        try:
            payload = {
                "employeeId": employee_id,
                "period": period
            }
            response = requests.post(f"{self.base_url}/payroll/calculate", json=payload)
            if response.status_code == 200:
                data = response.json()
                required_fields = ["baseSalary", "totalAllowances", "grossSalary", 
                                 "taxAmount", "totalDeductions", "netSalary"]
                
                if all(field in data for field in required_fields):
                    self.test_payroll_records.append(data)
                    
                    # Verify tax calculation logic
                    gross = data["grossSalary"]
                    expected_tax = gross * 0.15 if gross > 5000 else gross * 0.10
                    actual_tax = data["taxAmount"]
                    
                    tax_correct = abs(expected_tax - actual_tax) < 0.01
                    
                    self.log_test(f"Payroll Calculation - {period}", True, 
                                f"Net Salary: ${data['netSalary']:.2f}, Tax: ${actual_tax:.2f} (Tax calc correct: {tax_correct})")
                    return data
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test(f"Payroll Calculation - {period}", False, 
                                f"Missing fields: {missing}")
                    return None
            else:
                self.log_test(f"Payroll Calculation - {period}", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return None
        except Exception as e:
            self.log_test(f"Payroll Calculation - {period}", False, f"Error: {str(e)}")
            return None
    
    def test_get_payroll_records(self, period_filter=None):
        """Test retrieving payroll records with optional period filter"""
        filter_text = f" (filtered by {period_filter})" if period_filter else ""
        try:
            url = f"{self.base_url}/payroll"
            if period_filter:
                url += f"?period={period_filter}"
            
            response = requests.get(url)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test(f"Get Payroll Records{filter_text}", True, 
                                f"Found {len(data)} records")
                    return data
                else:
                    self.log_test(f"Get Payroll Records{filter_text}", False, 
                                f"Expected list, got: {type(data)}")
                    return None
            else:
                self.log_test(f"Get Payroll Records{filter_text}", False, 
                            f"Status: {response.status_code}")
                return None
        except Exception as e:
            self.log_test(f"Get Payroll Records{filter_text}", False, f"Error: {str(e)}")
            return None
    
    def test_get_employee_payroll(self, employee_id):
        """Test retrieving payroll records for a specific employee"""
        try:
            response = requests.get(f"{self.base_url}/payroll/employee/{employee_id}")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test(f"Get Employee Payroll - {employee_id}", True, 
                                f"Found {len(data)} records")
                    return data
                else:
                    self.log_test(f"Get Employee Payroll - {employee_id}", False, 
                                f"Expected list, got: {type(data)}")
                    return None
            else:
                self.log_test(f"Get Employee Payroll - {employee_id}", False, 
                            f"Status: {response.status_code}")
                return None
        except Exception as e:
            self.log_test(f"Get Employee Payroll - {employee_id}", False, f"Error: {str(e)}")
            return None
    
    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        try:
            response = requests.get(f"{self.base_url}/dashboard/stats")
            if response.status_code == 200:
                data = response.json()
                required_fields = ["totalEmployees", "totalPayroll", "avgSalary", "processedRecords"]
                
                if all(field in data for field in required_fields):
                    self.log_test("Dashboard Stats", True, 
                                f"Employees: {data['totalEmployees']}, Total Payroll: ${data['totalPayroll']:.2f}")
                    return data
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Dashboard Stats", False, f"Missing fields: {missing}")
                    return None
            else:
                self.log_test("Dashboard Stats", False, f"Status: {response.status_code}")
                return None
        except Exception as e:
            self.log_test("Dashboard Stats", False, f"Error: {str(e)}")
            return None
    
    def test_department_analytics(self):
        """Test department analytics endpoint"""
        try:
            response = requests.get(f"{self.base_url}/analytics/departments")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Department Analytics", True, 
                                f"Found {len(data)} departments")
                    for dept in data:
                        print(f"    {dept.get('department', 'Unknown')}: {dept.get('employeeCount', 0)} employees, Avg Salary: ${dept.get('avgSalary', 0):.2f}")
                    return data
                else:
                    self.log_test("Department Analytics", False, 
                                f"Expected list, got: {type(data)}")
                    return None
            else:
                self.log_test("Department Analytics", False, f"Status: {response.status_code}")
                return None
        except Exception as e:
            self.log_test("Department Analytics", False, f"Error: {str(e)}")
            return None
    
    def verify_tax_calculations(self):
        """Verify tax calculation logic with different salary scenarios"""
        print("=== TAX CALCULATION VERIFICATION ===")
        
        # Test scenarios
        test_cases = [
            {"baseSalary": 3000, "allowances": {"housing": 500}, "expected_tax_rate": 0.10},
            {"baseSalary": 4000, "allowances": {"housing": 800, "transport": 300}, "expected_tax_rate": 0.15},
            {"baseSalary": 6000, "allowances": {"housing": 1000}, "expected_tax_rate": 0.15},
            {"baseSalary": 2500, "allowances": {"medical": 200}, "expected_tax_rate": 0.10}
        ]
        
        all_correct = True
        for i, case in enumerate(test_cases):
            gross = case["baseSalary"] + sum(case["allowances"].values())
            expected_tax = gross * case["expected_tax_rate"]
            
            # Create test employee for this scenario
            test_emp = {
                "name": f"Tax Test Employee {i+1}",
                "email": f"taxtest{i+1}@company.com",
                "position": "Test Position",
                "department": "Testing",
                "baseSalary": case["baseSalary"],
                "allowances": case["allowances"],
                "deductions": {}
            }
            
            employee = self.test_create_employee(test_emp)
            if employee:
                payroll = self.test_payroll_calculation(employee["id"], f"2024-{i+1:02d}")
                if payroll:
                    actual_tax = payroll["taxAmount"]
                    tax_correct = abs(expected_tax - actual_tax) < 0.01
                    
                    if not tax_correct:
                        all_correct = False
                        print(f"    ❌ Tax calculation error for case {i+1}: Expected ${expected_tax:.2f}, Got ${actual_tax:.2f}")
                    else:
                        print(f"    ✅ Tax calculation correct for case {i+1}: ${actual_tax:.2f}")
                else:
                    all_correct = False
            else:
                all_correct = False
        
        self.log_test("Tax Calculation Logic Verification", all_correct)
        return all_correct
    
    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("=" * 60)
        print("PAYTRACK BACKEND API COMPREHENSIVE TEST SUITE")
        print("=" * 60)
        print()
        
        # Test 1: API Root
        self.test_api_root()
        
        # Test 2: Create sample employees with different salary structures
        print("=== EMPLOYEE MANAGEMENT TESTS ===")
        sample_employees = [
            {
                "name": "John Smith",
                "email": "john.smith@company.com",
                "position": "Software Engineer",
                "department": "Engineering",
                "baseSalary": 6000,
                "allowances": {
                    "housing": 1200,
                    "transport": 400,
                    "medical": 300
                },
                "deductions": {
                    "insurance": 200,
                    "loan": 0
                }
            },
            {
                "name": "Sarah Johnson",
                "email": "sarah.johnson@company.com",
                "position": "Marketing Manager",
                "department": "Marketing",
                "baseSalary": 4500,
                "allowances": {
                    "housing": 800,
                    "transport": 300,
                    "medical": 250
                },
                "deductions": {
                    "insurance": 150,
                    "loan": 100
                }
            },
            {
                "name": "Mike Davis",
                "email": "mike.davis@company.com",
                "position": "HR Specialist",
                "department": "Human Resources",
                "baseSalary": 3500,
                "allowances": {
                    "housing": 600,
                    "transport": 200,
                    "medical": 200
                },
                "deductions": {
                    "insurance": 100,
                    "loan": 50
                }
            }
        ]
        
        for emp_data in sample_employees:
            self.test_create_employee(emp_data)
        
        # Test 3: Get all employees
        self.test_get_all_employees()
        
        # Test 4: Get specific employees
        for emp in self.test_employees:
            self.test_get_employee_by_id(emp["id"])
        
        # Test 5: Payroll calculation (CORE FEATURE)
        print("=== PAYROLL CALCULATION TESTS (CORE FEATURE) ===")
        periods = ["2024-01", "2024-02", "2024-03"]
        
        for i, emp in enumerate(self.test_employees):
            period = periods[i % len(periods)]
            self.test_payroll_calculation(emp["id"], period)
        
        # Test 6: Tax calculation verification
        self.verify_tax_calculations()
        
        # Test 7: Payroll records retrieval
        print("=== PAYROLL RECORDS TESTS ===")
        self.test_get_payroll_records()
        self.test_get_payroll_records("2024-01")  # Test with period filter
        
        # Test 8: Employee-specific payroll records
        for emp in self.test_employees:
            self.test_get_employee_payroll(emp["id"])
        
        # Test 9: Analytics endpoints
        print("=== ANALYTICS TESTS ===")
        self.test_dashboard_stats()
        self.test_department_analytics()
        
        print("=" * 60)
        print("TEST SUITE COMPLETED")
        print("=" * 60)

def main():
    """Main test execution"""
    tester = PayTrackAPITester()
    tester.run_comprehensive_test()

if __name__ == "__main__":
    main()