-- =====================================================================
-- FacultyFlow AI — Faculty Workload Management Platform
-- PostgreSQL / Supabase Schema Definition
-- =====================================================================

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE faculty_designation AS ENUM ('Professor', 'Associate Professor', 'Assistant Professor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE course_type_enum AS ENUM ('Theory', 'Lab');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE availability_enum AS ENUM ('Available', 'On Leave', 'Sabbatical', 'Part-Time Available');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE plan_status_enum AS ENUM ('draft', 'pending_approval', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE solver_algorithm_enum AS ENUM ('csp_mrv_backtracking', 'hill_climbing_restart');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Faculty Table
CREATE TABLE IF NOT EXISTS faculty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    designation faculty_designation NOT NULL DEFAULT 'Assistant Professor',
    specializations TEXT[] NOT NULL DEFAULT '{}',
    lab_skills TEXT[] NOT NULL DEFAULT '{}',
    max_weekly_hours INTEGER NOT NULL CHECK (max_weekly_hours > 0 AND max_weekly_hours <= 40),
    availability availability_enum NOT NULL DEFAULT 'Available',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    course_type course_type_enum NOT NULL DEFAULT 'Theory',
    weekly_hours INTEGER NOT NULL CHECK (weekly_hours > 0 AND weekly_hours <= 12),
    required_specialization VARCHAR(255) NOT NULL,
    required_lab_skills TEXT[] NOT NULL DEFAULT '{}',
    eligible_faculty_restrictions UUID[] DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Allocation Plans Table
CREATE TABLE IF NOT EXISTS allocation_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    semester VARCHAR(100) NOT NULL,
    academic_year VARCHAR(50) NOT NULL,
    department VARCHAR(255) NOT NULL DEFAULT 'Computer Science & Engineering',
    status plan_status_enum NOT NULL DEFAULT 'draft',
    algorithm solver_algorithm_enum NOT NULL DEFAULT 'csp_mrv_backtracking',
    objective_max_load NUMERIC NOT NULL DEFAULT 0,
    objective_min_load NUMERIC NOT NULL DEFAULT 0,
    objective_variance NUMERIC NOT NULL DEFAULT 0,
    search_nodes INTEGER NOT NULL DEFAULT 0,
    branches_pruned INTEGER NOT NULL DEFAULT 0,
    elapsed_ms NUMERIC NOT NULL DEFAULT 0,
    optimality_proven BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    approved_at TIMESTAMPTZ,
    approved_by VARCHAR(255),
    rejection_reason TEXT,
    notes TEXT
);

-- 5. Allocation Assignments Table
CREATE TABLE IF NOT EXISTS allocation_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES allocation_plans(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES faculty(id) ON DELETE RESTRICT,
    weekly_hours INTEGER NOT NULL CHECK (weekly_hours > 0),
    explanation TEXT,
    is_manual_override BOOLEAN NOT NULL DEFAULT false,
    override_reason TEXT,
    override_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_course_per_plan UNIQUE(plan_id, course_id)
);

-- 6. Audit Events Table
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES allocation_plans(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    performed_by VARCHAR(255) NOT NULL DEFAULT 'Head of Department',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_faculty_code ON faculty(faculty_code);
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);
CREATE INDEX IF NOT EXISTS idx_assignments_plan ON allocation_assignments(plan_id);
CREATE INDEX IF NOT EXISTS idx_assignments_faculty ON allocation_assignments(faculty_id);
CREATE INDEX IF NOT EXISTS idx_audit_plan ON audit_events(plan_id);

-- 8. Row Level Security (RLS) Configuration
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated or anonymous users for demo/evaluation
CREATE POLICY "Allow public read access to faculty" ON faculty FOR SELECT USING (true);
CREATE POLICY "Allow public read access to courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Allow public read access to plans" ON allocation_plans FOR SELECT USING (true);
CREATE POLICY "Allow public read access to assignments" ON allocation_assignments FOR SELECT USING (true);
CREATE POLICY "Allow public read access to audit" ON audit_events FOR SELECT USING (true);
