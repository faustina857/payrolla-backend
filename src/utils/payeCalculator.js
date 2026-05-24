const calculatePAYE = (grossAnnualIncome) => {
  // consolidated relief allowance
  // 20% of gross income or 200,000 whichever is higher
  const reliefAllowance = Math.max(0.2 * grossAnnualIncome, 200000)

  // taxable income = gross annual income - relief allowance
  const taxableIncome = grossAnnualIncome - reliefAllowance

  if (taxableIncome <= 0) return 0

  const taxBands = [
    { limit: 300000, rate: 0.07 },   // 7% on first 300,000
    { limit: 300000, rate: 0.11 },   // 11% on next 300,000
    { limit: 500000, rate: 0.15 },   // 15% on next 500,000
    { limit: 500000, rate: 0.19 },   // 19% on next 500,000
    { limit: 1600000, rate: 0.21 },  // 21% on next 1,600,000
    { limit: Infinity, rate: 0.24 }, // 24% on anything above
  ]

  let tax = 0
  let remainingIncome = taxableIncome

  for (const band of taxBands) {
    if (remainingIncome <= 0) break

    const taxableAmount = Math.min(remainingIncome, band.limit)
    tax += taxableAmount * band.rate
    remainingIncome -= taxableAmount
  }

  // return monthly PAYE
  return Math.round(tax / 12)
}


// Calculate Working Days
const getWorkingDaysInMonth = (year, month) => {
  // month is 1-indexed (1 = January, 12 = December)
  const daysInMonth = new Date(year, month, 0).getDate()
  let workingDays = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    const dayOfWeek = date.getDay()
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++
    }
  }

  return workingDays
}

// Calculate Working Days Between Two Dates
const getWorkingDaysBetween = (startDate, endDate) => {
  let workingDays = 0
  const current = new Date(startDate)
  
  // normalize times to avoid comparison issues
  current.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++
    }
    current.setDate(current.getDate() + 1)
  }

  return workingDays
}

// Calculate Pro-rate Factor
const getProRateFactor = (employee, payrollMonth, payrollYear) => {
  const startDate = new Date(employee.startDate)
  const startYear = startDate.getFullYear()
  const startMonth = startDate.getMonth() + 1 // 1-indexed

  // employee started before this payroll period — full salary
  if (
    startYear < payrollYear ||
    (startYear === payrollYear && startMonth < payrollMonth)
  ) {
    return 1 // full salary — no pro-rating needed
  }

  // employee started this month — pro-rate
  if (startYear === payrollYear && startMonth === payrollMonth) {
    // last day of payroll month
    const lastDayOfMonth = new Date(payrollYear, payrollMonth, 0)

    // total working days in the month
    const totalWorkingDays = getWorkingDaysInMonth(payrollYear, payrollMonth)

    // working days the employee actually worked
    const daysWorked = getWorkingDaysBetween(startDate, lastDayOfMonth)

    // pro-rate factor — between 0 and 1
    return Number((daysWorked / totalWorkingDays).toFixed(4))
  }

  // employee starts in a future month — should not be in payroll
  return 0
}

// Update calculateDeductions
const calculateDeductions = (employee, loanRepayment = 0, proRateFactor = 1) => {
  const { basicSalary, housing, transport, meal, utility } = employee.salary

  // apply pro-rate factor to all components
  const proRatedBasic = Math.round(basicSalary * proRateFactor)
  const proRatedHousing = Math.round(housing * proRateFactor)
  const proRatedTransport = Math.round(transport * proRateFactor)
  const proRatedMeal = Math.round(meal * proRateFactor)
  const proRatedUtility = Math.round(utility * proRateFactor)

  const grossSalary =
    proRatedBasic +
    proRatedHousing +
    proRatedTransport +
    proRatedMeal +
    proRatedUtility

  // PAYE calculated on annual gross
  const grossAnnualIncome = grossSalary * 12
  const paye = calculatePAYE(grossAnnualIncome)

  // pension and NHF based on pro-rated basic
  const employeePension = Math.round(proRatedBasic * 0.08)
  const employerPension = Math.round(proRatedBasic * 0.10)
  const nhf = Math.round(proRatedBasic * 0.025)

  const totalDeductions = paye + employeePension + nhf + loanRepayment
  const netSalary = grossSalary - totalDeductions

  return {
    grossSalary,
    proRateFactor,
    isProRated: proRateFactor < 1,
    earnings: {
      basicSalary: proRatedBasic,
      housing: proRatedHousing,
      transport: proRatedTransport,
      meal: proRatedMeal,
      utility: proRatedUtility,
      grossSalary,
    },
    deductions: {
      paye,
      employeePension,
      nhf,
      loanRepayment,
      totalDeductions,
    },
    employerContributions: {
      employerPension,
    },
    netSalary,
  }
}

module.exports = {
  calculatePAYE,
  calculateDeductions,
  getProRateFactor,
}