#!/usr/bin/env python3
"""
Additional Edge Case Tests for Puzzle API
Tests error handling and edge cases
"""

import requests
import json
import sys

# Backend URL from environment
BACKEND_URL = "https://puzzlejoy-4.preview.emergentagent.com/api"

def test_delete_nonexistent_puzzle():
    """Test deleting a puzzle that doesn't exist"""
    print("🔍 Testing delete non-existent puzzle...")
    
    fake_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format but doesn't exist
    
    try:
        response = requests.delete(f"{BACKEND_URL}/puzzles/{fake_id}")
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 404:
            print("✅ Correctly returned 404 for non-existent puzzle")
            return True
        else:
            print(f"❌ Expected 404, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Delete non-existent puzzle test failed: {e}")
        return False

def test_delete_invalid_id():
    """Test deleting with invalid ObjectId format"""
    print("🔍 Testing delete with invalid ID format...")
    
    invalid_id = "invalid-id-format"
    
    try:
        response = requests.delete(f"{BACKEND_URL}/puzzles/{invalid_id}")
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code in [400, 422, 500]:  # Any error status is acceptable
            print("✅ Correctly handled invalid ID format")
            return True
        else:
            print(f"❌ Expected error status, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Invalid ID test failed: {e}")
        return False

def test_upload_puzzle_missing_fields():
    """Test uploading puzzle with missing required fields"""
    print("🔍 Testing puzzle upload with missing fields...")
    
    # Test with missing name
    puzzle_data = {
        "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/puzzles",
            json=puzzle_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 422:  # Validation error
            print("✅ Correctly returned 422 for missing required field")
            return True
        else:
            print(f"❌ Expected 422, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Missing fields test failed: {e}")
        return False

def test_upload_empty_name():
    """Test uploading puzzle with empty name"""
    print("🔍 Testing puzzle upload with empty name...")
    
    puzzle_data = {
        "name": "",
        "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/puzzles",
            json=puzzle_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code in [200, 422]:  # Either accept or reject is fine
            if response.status_code == 200:
                print("✅ Accepted empty name (implementation choice)")
                # Clean up the created puzzle
                data = response.json()
                requests.delete(f"{BACKEND_URL}/puzzles/{data['id']}")
            else:
                print("✅ Correctly rejected empty name")
            return True
        else:
            print(f"❌ Unexpected status code: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Empty name test failed: {e}")
        return False

def run_edge_case_tests():
    """Run edge case tests"""
    print("🚀 Starting Edge Case Tests")
    print("=" * 40)
    
    tests = [
        test_delete_nonexistent_puzzle,
        test_delete_invalid_id,
        test_upload_puzzle_missing_fields,
        test_upload_empty_name
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 40)
    print(f"Edge Case Tests: {passed}/{total} passed")
    
    return passed == total

if __name__ == "__main__":
    success = run_edge_case_tests()
    
    if success:
        print("✅ ALL EDGE CASE TESTS PASSED")
        sys.exit(0)
    else:
        print("❌ SOME EDGE CASE TESTS FAILED")
        sys.exit(1)