import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 1. Read environment variables from .env.local and .env.admin
const envLocalPath = path.resolve(process.cwd(), '.env.local')
const envAdminPath = path.resolve(process.cwd(), '.env.admin')

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath })
}

if (fs.existsSync(envAdminPath)) {
  dotenv.config({ path: envAdminPath, override: true })
}

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.PROJECT_URL

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('Error: Project URL not found in .env.local or .env.admin')
  process.exit(1)
}

if (!serviceRoleKey) {
  console.error(
    'Error: Service role key not found in .env.admin.\n' +
    'Please set SUPABASE_SERVICE_ROLE_KEY=your_key in .env.admin'
  )
  process.exit(1)
}

// 2. Initialize Supabase Admin client (with service_role bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Generate a secure random password
function generatePassword(length = 16) {
  return crypto.randomBytes(length).toString('base64').slice(0, length) + '!9Aa'
}

const demoUsers = [
  {
    email: 'commander@rasad.demo',
    fullName: 'Base Commander',
    role: 'commander',
    postId: null,
  },
  {
    email: 'officer@rasad.demo',
    fullName: 'Logistics Officer',
    role: 'logistics_officer',
    postId: null,
  },
  {
    email: 'postcmd@rasad.demo',
    fullName: 'Post Commander P03',
    role: 'post_commander',
    postId: 'P03',
  },
  {
    email: 'viewer@rasad.demo',
    fullName: 'Operational Viewer',
    role: 'viewer',
    postId: null,
  },
]

async function setup() {
  console.log('Connecting to Supabase at:', supabaseUrl)
  const credentialsLog = []

  for (const userDef of demoUsers) {
    const password = generatePassword(14)
    console.log(`\nProcessing user: ${userDef.email}...`)

    // Check if user already exists in auth
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      console.error('Failed to list users:', listError.message)
      process.exit(1)
    }

    let existingUser = listData.users.find((u) => u.email === userDef.email)
    let userId = null

    if (existingUser) {
      console.log(`User ${userDef.email} already exists. Updating password & confirmation...`)
      userId = existingUser.id
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true,
        user_metadata: { full_name: userDef.fullName },
      })
      if (updateError) {
        console.error(`Error updating user ${userDef.email}:`, updateError.message)
      }
    } else {
      console.log(`Creating user ${userDef.email}...`)
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: userDef.email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: userDef.fullName },
      })

      if (createError) {
        console.error(`Failed to create ${userDef.email}:`, createError.message)
        continue
      }
      userId = createData.user.id
    }

    // Upsert into profiles table to set role and post_id
    console.log(`Setting profile role="${userDef.role}", post_id="${userDef.postId || 'N/A'}"...`)
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: userDef.fullName,
      role: userDef.role,
      post_id: userDef.postId,
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      console.error(`Failed to update profile for ${userDef.email}:`, profileError.message)
    } else {
      console.log(`Profile successfully configured for ${userDef.email}`)
    }

    credentialsLog.push({
      email: userDef.email,
      password: password,
      role: userDef.role,
      postId: userDef.postId || 'None',
    })
  }

  // Format file contents for demo-logins.txt
  const fileLines = [
    '====================================================',
    '       RASAD DEMO CREDENTIALS (UNCLASSIFIED)        ',
    '====================================================',
    `Generated on: ${new Date().toISOString()}`,
    '',
    ...credentialsLog.map(
      (c) =>
        `Email:     ${c.email}\n` +
        `Password:  ${c.password}\n` +
        `Role:      ${c.role}\n` +
        `Post ID:   ${c.postId}\n` +
        '----------------------------------------------------'
    ),
  ]

  const outputPath = path.resolve(process.cwd(), 'demo-logins.txt')
  fs.writeFileSync(outputPath, fileLines.join('\n'), 'utf-8')
  console.log(`\nDemo logins saved successfully to: ${outputPath}`)
}

setup().catch((err) => {
  console.error('Fatal error during setup:', err)
  process.exit(1)
})
