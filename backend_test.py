#!/usr/bin/env python3
"""
Backend API Testing Suite for Admin Dashboard Endpoints
Tests the new category management and bulk upload functionality
"""

import requests
import json
import base64
from datetime import datetime
import sys

# Get backend URL from environment
BACKEND_URL = "https://jigsawfun-2.preview.emergentagent.com/api"

# Small test images in base64 format (1x1 pixel images)
TEST_IMAGE_FLAG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg=="
TEST_IMAGE_CAR = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
TEST_IMAGE_TRUCK = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

def create_test_base64_image():
    """Create a small test base64 image (1x1 pixel PNG)"""
    # This is a minimal 1x1 pixel transparent PNG in base64
    return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

def print_test_header(test_name):
    print(f"\n{'='*60}")
    print(f"TESTING: {test_name}")
    print(f"{'='*60}")

def print_result(success, message):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")

def test_api_health():
    """Test if the API is running"""
    print("🔍 Testing API health...")
    try:
        response = requests.get(f"{BACKEND_URL}/")
        if response.status_code == 200:
            print("✅ API is running")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ API health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API health check failed: {e}")
        return False

def test_upload_puzzle():
    """Test POST /api/puzzles - Upload a puzzle with base64 image"""
    print("\n🔍 Testing puzzle upload (POST /api/puzzles)...")
    
    test_image = create_test_base64_image()
    puzzle_data = {
        "name": "Test Puzzle Rainbow",
        "image_base64": test_image
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/puzzles",
            json=puzzle_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Puzzle upload successful")
            print(f"   Puzzle ID: {data.get('id')}")
            print(f"   Name: {data.get('name')}")
            print(f"   Created At: {data.get('created_at')}")
            print(f"   Image Base64 Length: {len(data.get('image_base64', ''))}")
            
            # Verify required fields
            required_fields = ['id', 'name', 'image_base64', 'created_at']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print(f"❌ Missing required fields: {missing_fields}")
                return None
            
            return data['id']
        else:
            print(f"❌ Puzzle upload failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Puzzle upload failed: {e}")
        return None

def test_get_all_puzzles():
    """Test GET /api/puzzles - Fetch all puzzles"""
    print("\n🔍 Testing get all puzzles (GET /api/puzzles)...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/puzzles")
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Get all puzzles successful")
            print(f"   Number of puzzles: {len(data)}")
            
            if len(data) > 0:
                puzzle = data[0]
                print(f"   First puzzle ID: {puzzle.get('id')}")
                print(f"   First puzzle name: {puzzle.get('name')}")
                print(f"   First puzzle image length: {len(puzzle.get('image_base64', ''))}")
                
                # Verify structure of returned puzzles
                required_fields = ['id', 'name', 'image_base64', 'created_at']
                missing_fields = [field for field in required_fields if field not in puzzle]
                
                if missing_fields:
                    print(f"❌ Missing required fields in puzzle: {missing_fields}")
                    return False
                
                return data
            else:
                print("   No puzzles found in database")
                return []
        else:
            print(f"❌ Get all puzzles failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Get all puzzles failed: {e}")
        return None

def test_delete_puzzle(puzzle_id):
    """Test DELETE /api/puzzles/{puzzle_id} - Delete puzzle"""
    print(f"\n🔍 Testing delete puzzle (DELETE /api/puzzles/{puzzle_id})...")
    
    if not puzzle_id:
        print("❌ No puzzle ID provided for deletion test")
        return False
    
    try:
        response = requests.delete(f"{BACKEND_URL}/puzzles/{puzzle_id}")
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Puzzle deletion successful")
            print(f"   Response: {data}")
            return True
        elif response.status_code == 404:
            print("❌ Puzzle not found (404)")
            return False
        else:
            print(f"❌ Puzzle deletion failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Puzzle deletion failed: {e}")
        return False

def verify_puzzle_deleted(puzzle_id):
    """Verify that the puzzle no longer exists in the database"""
    print(f"\n🔍 Verifying puzzle {puzzle_id} is deleted...")
    
    puzzles = test_get_all_puzzles()
    if puzzles is None:
        print("❌ Could not fetch puzzles to verify deletion")
        return False
    
    # Check if the deleted puzzle ID still exists
    for puzzle in puzzles:
        if puzzle.get('id') == puzzle_id:
            print(f"❌ Puzzle {puzzle_id} still exists after deletion")
            return False
    
    print(f"✅ Puzzle {puzzle_id} successfully deleted from database")
    return True

def run_full_test_suite():
    """Run the complete test suite for puzzle API"""
    print("🚀 Starting Puzzle API Test Suite")
    print("=" * 50)
    
    # Test 1: API Health Check
    if not test_api_health():
        print("\n❌ API health check failed. Stopping tests.")
        return False
    
    # Test 2: Upload Puzzle
    puzzle_id = test_upload_puzzle()
    if not puzzle_id:
        print("\n❌ Puzzle upload failed. Stopping tests.")
        return False
    
    # Test 3: Get All Puzzles (should include uploaded puzzle)
    puzzles = test_get_all_puzzles()
    if puzzles is None:
        print("\n❌ Get all puzzles failed. Continuing with deletion test.")
    else:
        # Verify our uploaded puzzle is in the list
        found_puzzle = False
        for puzzle in puzzles:
            if puzzle.get('id') == puzzle_id:
                found_puzzle = True
                break
        
        if found_puzzle:
            print(f"✅ Uploaded puzzle {puzzle_id} found in puzzle list")
        else:
            print(f"❌ Uploaded puzzle {puzzle_id} not found in puzzle list")
    
    # Test 4: Delete Puzzle
    if not test_delete_puzzle(puzzle_id):
        print(f"\n❌ Puzzle deletion failed for ID: {puzzle_id}")
        return False
    
    # Test 5: Verify Deletion
    if not verify_puzzle_deleted(puzzle_id):
        print(f"\n❌ Puzzle deletion verification failed for ID: {puzzle_id}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 All Puzzle API tests completed successfully!")
    return True

if __name__ == "__main__":
    print(f"Testing backend at: {BACKEND_URL}")
    success = run_full_test_suite()
    
    if success:
        print("\n✅ ALL TESTS PASSED")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED")
        sys.exit(1)