'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, DollarSign, Calculator, FileText, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function PayTrackApp() {
  const [employees, setEmployees] = useState([])
  const [payrollRecords, setPayrollRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('2024-06')

  // Employee form state
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    email: '',
    position: '',
    department: '',
    baseSalary: '',
    allowances: {
      housing: '',
      transport: '',
      medical: ''
    },
    deductions: {
      tax: '',
      insurance: '',
      loan: ''
    }
  })

  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Fetch data on component mount
  useEffect(() => {
    fetchEmployees()
    fetchPayrollRecords()
  }, [selectedPeriod])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees')
      const data = await response.json()
      setEmployees(data)
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchPayrollRecords = async () => {
    try {
      const response = await fetch(`/api/payroll?period=${selectedPeriod}`)
      const data = await response.json()
      setPayrollRecords(data)
    } catch (error) {
      console.error('Error fetching payroll records:', error)
    }
  }

  const handleEmployeeSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...employeeForm,
          baseSalary: parseFloat(employeeForm.baseSalary),
          allowances: {
            housing: parseFloat(employeeForm.allowances.housing) || 0,
            transport: parseFloat(employeeForm.allowances.transport) || 0,
            medical: parseFloat(employeeForm.allowances.medical) || 0
          },
          deductions: {
            tax: parseFloat(employeeForm.deductions.tax) || 0,
            insurance: parseFloat(employeeForm.deductions.insurance) || 0,
            loan: parseFloat(employeeForm.deductions.loan) || 0
          }
        })
      })

      if (response.ok) {
        setEmployeeForm({
          name: '',
          email: '',
          position: '',
          department: '',
          baseSalary: '',
          allowances: { housing: '', transport: '', medical: '' },
          deductions: { tax: '', insurance: '', loan: '' }
        })
        setIsDialogOpen(false)
        fetchEmployees()
      }
    } catch (error) {
      console.error('Error creating employee:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculatePayroll = async (employeeId) => {
    setLoading(true)
    try {
      const response = await fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, period: selectedPeriod })
      })

      if (response.ok) {
        fetchPayrollRecords()
      }
    } catch (error) {
      console.error('Error calculating payroll:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPayroll = payrollRecords.reduce((sum, record) => sum + (record.netSalary || 0), 0)
  const avgSalary = payrollRecords.length > 0 ? totalPayroll / payrollRecords.length : 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">PayTrack</h1>
              <Badge variant="secondary">Intelligent Payroll System</Badge>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEmployeeSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={employeeForm.name}
                        onChange={(e) => setEmployeeForm(prev => ({...prev, name: e.target.value}))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={employeeForm.email}
                        onChange={(e) => setEmployeeForm(prev => ({...prev, email: e.target.value}))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        value={employeeForm.position}
                        onChange={(e) => setEmployeeForm(prev => ({...prev, position: e.target.value}))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Select onValueChange={(value) => setEmployeeForm(prev => ({...prev, department: value}))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hr">Human Resources</SelectItem>
                          <SelectItem value="engineering">Engineering</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="baseSalary">Base Salary ($)</Label>
                      <Input
                        id="baseSalary"
                        type="number"
                        value={employeeForm.baseSalary}
                        onChange={(e) => setEmployeeForm(prev => ({...prev, baseSalary: e.target.value}))}
                        required
                      />
                    </div>
                  </div>

                  {/* Allowances */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Allowances</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="housing">Housing ($)</Label>
                        <Input
                          id="housing"
                          type="number"
                          value={employeeForm.allowances.housing}
                          onChange={(e) => setEmployeeForm(prev => ({
                            ...prev, 
                            allowances: {...prev.allowances, housing: e.target.value}
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="transport">Transport ($)</Label>
                        <Input
                          id="transport"
                          type="number"
                          value={employeeForm.allowances.transport}
                          onChange={(e) => setEmployeeForm(prev => ({
                            ...prev, 
                            allowances: {...prev.allowances, transport: e.target.value}
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="medical">Medical ($)</Label>
                        <Input
                          id="medical"
                          type="number"
                          value={employeeForm.allowances.medical}
                          onChange={(e) => setEmployeeForm(prev => ({
                            ...prev, 
                            allowances: {...prev.allowances, medical: e.target.value}
                          }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Deductions</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="tax">Tax ($)</Label>
                        <Input
                          id="tax"
                          type="number"
                          value={employeeForm.deductions.tax}
                          onChange={(e) => setEmployeeForm(prev => ({
                            ...prev, 
                            deductions: {...prev.deductions, tax: e.target.value}
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="insurance">Insurance ($)</Label>
                        <Input
                          id="insurance"
                          type="number"
                          value={employeeForm.deductions.insurance}
                          onChange={(e) => setEmployeeForm(prev => ({
                            ...prev, 
                            deductions: {...prev.deductions, insurance: e.target.value}
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="loan">Loan ($)</Label>
                        <Input
                          id="loan"
                          type="number"
                          value={employeeForm.deductions.loan}
                          onChange={(e) => setEmployeeForm(prev => ({
                            ...prev, 
                            deductions: {...prev.deductions, loan: e.target.value}
                          }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Creating...' : 'Create Employee'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalPayroll.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Salary</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${avgSalary.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processed</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payrollRecords.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="employees" className="space-y-6">
          <TabsList>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="payroll">Payroll Records</TabsTrigger>
          </TabsList>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Employee Directory</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Base Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map(employee => {
                      const hasPayroll = payrollRecords.find(p => p.employeeId === employee.id)
                      return (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell>{employee.position}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {employee.department}
                            </Badge>
                          </TableCell>
                          <TableCell>${employee.baseSalary?.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={hasPayroll ? "default" : "secondary"}>
                              {hasPayroll ? 'Processed' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              onClick={() => calculatePayroll(employee.id)}
                              disabled={loading}
                            >
                              <Calculator className="h-4 w-4 mr-1" />
                              Calculate
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payroll Records Tab */}
          <TabsContent value="payroll" className="space-y-6">
            <div className="flex items-center space-x-4">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-06">June 2024</SelectItem>
                  <SelectItem value="2024-05">May 2024</SelectItem>
                  <SelectItem value="2024-04">April 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payroll Records - {selectedPeriod}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Base Salary</TableHead>
                      <TableHead>Allowances</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Gross Salary</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRecords.map(record => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.employeeName}</TableCell>
                        <TableCell>${record.baseSalary?.toLocaleString()}</TableCell>
                        <TableCell className="text-green-600">+${record.totalAllowances?.toLocaleString()}</TableCell>
                        <TableCell className="text-red-600">-${record.totalDeductions?.toLocaleString()}</TableCell>
                        <TableCell>${record.grossSalary?.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">${record.netSalary?.toLocaleString()}</TableCell>
                        <TableCell>{new Date(record.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}