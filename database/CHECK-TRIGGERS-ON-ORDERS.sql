-- Check what triggers are on the orders table
-- This will help us understand what's preventing the update

SELECT
    'Triggers on orders table:' as info,
    trigger_name,
    event_manipulation as "Event",
    action_timing as "When",
    action_statement as "Action"
FROM information_schema.triggers
WHERE event_object_table = 'orders'
ORDER BY trigger_name;

-- Check constraints on orders table
SELECT
    'Constraints on orders table:' as info,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'orders'
ORDER BY constraint_name;

-- Check if there's a CHECK constraint on status column
SELECT
    'Check constraints on orders.status:' as info,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'orders'::regclass
AND contype = 'c'
ORDER BY conname;
