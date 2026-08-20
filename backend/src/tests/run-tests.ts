import assert from 'assert';
import { isValidTransition, isActorAuthorized } from '../utils/state-machine';

function runStateMachineTests() {
  console.log('==================================================');
  console.log('RUNNING BACKEND WORKFLOW & STATE ENGINE TESTS');
  console.log('==================================================');

  try {
    // 1. Validate Legal Status Flow Transitions
    console.log('Testing valid transitions...');
    assert.strictEqual(isValidTransition('NEW', 'BILLING_PENDING'), true, 'NEW -> BILLING_PENDING should be allowed');
    assert.strictEqual(isValidTransition('BILLING_PENDING', 'BILLING_COMPLETED'), true, 'BILLING_PENDING -> BILLING_COMPLETED should be allowed');
    assert.strictEqual(isValidTransition('BILLING_COMPLETED', 'PACKING_PENDING'), true, 'BILLING_COMPLETED -> PACKING_PENDING should be allowed');
    assert.strictEqual(isValidTransition('PACKING_PENDING', 'PACKING_COMPLETED'), true, 'PACKING_PENDING -> PACKING_COMPLETED should be allowed');
    assert.strictEqual(isValidTransition('PACKING_COMPLETED', 'READY_FOR_DELIVERY'), true, 'PACKING_COMPLETED -> READY_FOR_DELIVERY should be allowed');
    assert.strictEqual(isValidTransition('READY_FOR_DELIVERY', 'ASSIGNED'), true, 'READY_FOR_DELIVERY -> ASSIGNED should be allowed');
    assert.strictEqual(isValidTransition('ASSIGNED', 'OUT_FOR_DELIVERY'), true, 'ASSIGNED -> OUT_FOR_DELIVERY should be allowed');
    assert.strictEqual(isValidTransition('OUT_FOR_DELIVERY', 'DELIVERED'), true, 'OUT_FOR_DELIVERY -> DELIVERED should be allowed');
    assert.strictEqual(isValidTransition('OUT_FOR_DELIVERY', 'UNDELIVERED'), true, 'OUT_FOR_DELIVERY -> UNDELIVERED should be allowed');

    // 2. Validate Legal Redelivery Transitions
    console.log('Testing undelivered retry routes...');
    assert.strictEqual(isValidTransition('UNDELIVERED', 'ASSIGNED'), true, 'UNDELIVERED -> ASSIGNED should be allowed for redelivery');
    assert.strictEqual(isValidTransition('UNDELIVERED', 'READY_FOR_DELIVERY'), true, 'UNDELIVERED -> READY_FOR_DELIVERY should be allowed for return to pool');

    // 3. Validate Prohibited Illegal Transitions
    console.log('Testing invalid/out-of-order transitions...');
    assert.strictEqual(isValidTransition('NEW', 'DELIVERED'), false, 'NEW -> DELIVERED must be blocked');
    assert.strictEqual(isValidTransition('BILLING_PENDING', 'PACKING_COMPLETED'), false, 'BILLING_PENDING -> PACKING_COMPLETED must be blocked');
    assert.strictEqual(isValidTransition('OUT_FOR_DELIVERY', 'ASSIGNED'), false, 'OUT_FOR_DELIVERY -> ASSIGNED must be blocked');
    assert.strictEqual(isValidTransition('DELIVERED', 'NEW'), false, 'DELIVERED -> NEW must be blocked');
    assert.strictEqual(isValidTransition('PACKING_PENDING', 'READY_FOR_DELIVERY'), false, 'PACKING_PENDING -> READY_FOR_DELIVERY must be blocked');

    console.log('✔ All transition state validations passed successfully!');

    // 4. Validate Role Authorization rules
    console.log('Testing role permissions...');
    assert.strictEqual(isActorAuthorized('CALL_RECEIVER', 'NEW'), true, 'CALL_RECEIVER must be authorized for NEW');
    assert.strictEqual(isActorAuthorized('BILLER', 'BILLING_COMPLETED'), true, 'BILLER must be authorized for BILLING_COMPLETED');
    assert.strictEqual(isActorAuthorized('PACKER', 'PACKING_COMPLETED'), true, 'PACKER must be authorized for PACKING_COMPLETED');
    assert.strictEqual(isActorAuthorized('DELIVERY_TEAM', 'ASSIGNED'), true, 'DELIVERY_TEAM must be authorized for ASSIGNED');
    assert.strictEqual(isActorAuthorized('DELIVERY_BOY', 'OUT_FOR_DELIVERY'), true, 'DELIVERY_BOY must be authorized for OUT_FOR_DELIVERY');
    assert.strictEqual(isActorAuthorized('DELIVERY_BOY', 'DELIVERED'), true, 'DELIVERY_BOY must be authorized for DELIVERED');
    assert.strictEqual(isActorAuthorized('DELIVERY_BOY', 'UNDELIVERED'), true, 'DELIVERY_BOY must be authorized for UNDELIVERED');
    assert.strictEqual(isActorAuthorized('ADMIN', 'DELIVERED'), true, 'ADMIN must be authorized to trigger any state');

    // 5. Validate Prohibited Role Transitions
    console.log('Testing unauthorized role blocks...');
    assert.strictEqual(isActorAuthorized('DELIVERY_BOY', 'BILLING_COMPLETED'), false, 'DELIVERY_BOY must be blocked from billing completion');
    assert.strictEqual(isActorAuthorized('BILLER', 'DELIVERED'), false, 'BILLER must be blocked from marking delivered');
    assert.strictEqual(isActorAuthorized('CALL_RECEIVER', 'PACKING_COMPLETED'), false, 'CALL_RECEIVER must be blocked from packing completion');
    assert.strictEqual(isActorAuthorized('PACKER', 'ASSIGNED'), false, 'PACKER must be blocked from dispatch assignments');

    console.log('✔ All role actor validations passed successfully!');
    console.log('==================================================');
    console.log('TEST SUITE STATUS: SUCCESS (0 failures)');
    console.log('==================================================');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Test check failed:', error.message);
    process.exit(1);
  }
}

runStateMachineTests();
