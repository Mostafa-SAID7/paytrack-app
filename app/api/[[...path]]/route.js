import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'

// MongoDB connection
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// Payroll calculation logic
function calculatePayrollForEmployee(employee, workingDays = 22) {
  const baseSalary = employee.baseSalary || 0
  const allowances = employee.allowances || {}
  const deductions = employee.deductions || {}
  
  // Calculate total allowances
  const totalAllowances = (allowances.housing || 0) + 
                          (allowances.transport || 0) + 
                          (allowances.medical || 0)
  
  // Calculate gross salary
  const grossSalary = baseSalary + totalAllowances
  
  // Calculate taxes (simplified - 15% on gross above $5000, 10% below)
  let taxAmount = 0
  if (grossSalary > 5000) {
    taxAmount = grossSalary * 0.15
  } else {
    taxAmount = grossSalary * 0.10
  }
  
  // Add manual deductions
  const manualDeductions = (deductions.tax || 0) + 
                          (deductions.insurance || 0) + 
                          (deductions.loan || 0)
  
  const totalDeductions = taxAmount + manualDeductions
  
  // Calculate net salary
  const netSalary = grossSalary - totalDeductions
  
  return {
    baseSalary,
    totalAllowances,
    grossSalary,
    taxAmount,
    totalDeductions,
    netSalary,
    breakdown: {
      allowances: {
        housing: allowances.housing || 0,
        transport: allowances.transport || 0,
        medical: allowances.medical || 0
      },
      deductions: {
        tax: taxAmount,
        insurance: deductions.insurance || 0,
        loan: deductions.loan || 0,
        customTax: deductions.tax || 0
      }
    }
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    // Root endpoint
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: "PayTrack API v1.0" }))
    }

    // Employee endpoints
    if (route === '/employees' && method === 'GET') {
      const employees = await db.collection('employees').find({}).toArray()
      const cleanedEmployees = employees.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleanedEmployees))
    }

    if (route === '/employees' && method === 'POST') {
      const body = await request.json()
      
      const employee = {
        id: uuidv4(),
        name: body.name,
        email: body.email,
        position: body.position,
        department: body.department,
        baseSalary: body.baseSalary,
        allowances: body.allowances,
        deductions: body.deductions,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active'
      }

      await db.collection('employees').insertOne(employee)
      const { _id, ...cleanEmployee } = employee
      return handleCORS(NextResponse.json(cleanEmployee))
    }

    // Get employee by ID
    if (route.startsWith('/employees/') && method === 'GET') {
      const employeeId = route.split('/')[2]
      const employee = await db.collection('employees').findOne({ id: employeeId })
      
      if (!employee) {
        return handleCORS(NextResponse.json(
          { error: "Employee not found" }, 
          { status: 404 }
        ))
      }

      const { _id, ...cleanEmployee } = employee
      return handleCORS(NextResponse.json(cleanEmployee))
    }

    // Payroll calculation endpoint
    if (route === '/payroll/calculate' && method === 'POST') {
      const body = await request.json()
      const { employeeId, period } = body

      // Get employee details
      const employee = await db.collection('employees').findOne({ id: employeeId })
      if (!employee) {
        return handleCORS(NextResponse.json(
          { error: "Employee not found" }, 
          { status: 404 }
        ))
      }

      // Check if payroll already exists for this period
      const existingPayroll = await db.collection('payroll_records').findOne({
        employeeId,
        period
      })

      if (existingPayroll) {
        return handleCORS(NextResponse.json(
          { error: "Payroll already calculated for this period" }, 
          { status: 400 }
        ))
      }

      // Calculate payroll
      const payrollCalculation = calculatePayrollForEmployee(employee)
      
      const payrollRecord = {
        id: uuidv4(),
        employeeId,
        employeeName: employee.name,
        period,
        ...payrollCalculation,
        createdAt: new Date(),
        status: 'calculated'
      }

      await db.collection('payroll_records').insertOne(payrollRecord)
      const { _id, ...cleanRecord } = payrollRecord
      return handleCORS(NextResponse.json(cleanRecord))
    }

    // Get payroll records
    if (route === '/payroll' && method === 'GET') {
      const url = new URL(request.url)
      const period = url.searchParams.get('period')
      
      let query = {}
      if (period) {
        query.period = period
      }

      const payrollRecords = await db.collection('payroll_records')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray()
      
      const cleanedRecords = payrollRecords.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleanedRecords))
    }

    // Get payroll by employee
    if (route.startsWith('/payroll/employee/') && method === 'GET') {
      const employeeId = route.split('/')[3]
      const payrollRecords = await db.collection('payroll_records')
        .find({ employeeId })
        .sort({ createdAt: -1 })
        .toArray()
      
      const cleanedRecords = payrollRecords.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleanedRecords))
    }

    // Dashboard stats
    if (route === '/dashboard/stats' && method === 'GET') {
      const employeeCount = await db.collection('employees').countDocuments()
      const payrollRecords = await db.collection('payroll_records').find({}).toArray()
      
      const totalPayroll = payrollRecords.reduce((sum, record) => sum + (record.netSalary || 0), 0)
      const avgSalary = payrollRecords.length > 0 ? totalPayroll / payrollRecords.length : 0
      
      const stats = {
        totalEmployees: employeeCount,
        totalPayroll,
        avgSalary,
        processedRecords: payrollRecords.length
      }
      
      return handleCORS(NextResponse.json(stats))
    }

    // Department analysis
    if (route === '/analytics/departments' && method === 'GET') {
      const employees = await db.collection('employees').find({}).toArray()
      const payrollRecords = await db.collection('payroll_records').find({}).toArray()
      
      const departmentData = {}
      
      employees.forEach(emp => {
        if (!departmentData[emp.department]) {
          departmentData[emp.department] = {
            department: emp.department,
            employeeCount: 0,
            totalSalary: 0,
            avgSalary: 0
          }
        }
        departmentData[emp.department].employeeCount++
        
        // Find payroll for this employee
        const empPayroll = payrollRecords.filter(p => p.employeeId === emp.id)
        if (empPayroll.length > 0) {
          const latestPayroll = empPayroll.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
          departmentData[emp.department].totalSalary += latestPayroll.netSalary || 0
        }
      })
      
      // Calculate averages
      Object.keys(departmentData).forEach(dept => {
        const data = departmentData[dept]
        data.avgSalary = data.employeeCount > 0 ? data.totalSalary / data.employeeCount : 0
      })
      
      return handleCORS(NextResponse.json(Object.values(departmentData)))
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` }, 
      { status: 404 }
    ))

  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json(
      { error: "Internal server error", details: error.message }, 
      { status: 500 }
    ))
  }
}

// Export all HTTP methods
export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute