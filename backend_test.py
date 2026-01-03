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
    print_test_header("API Health Check")
    try:
        response = requests.get(f"{BACKEND_URL}/")
        if response.status_code == 200:
            print_result(True, f"API is running: {response.json()}")
            return True
        else:
            print_result(False, f"API health check failed: {response.status_code}")
            return False
    except Exception as e:
        print_result(False, f"API health check failed: {e}")
        return False

def test_create_categories():
    """Test creating categories with different icons and colors"""
    print_test_header("Create Categories")
    
    # Test 1: Create Flags category
    flags_data = {
        "name": "Flags",
        "icon": "🏳️",
        "color": "#FF9800"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/categories", json=flags_data)
        if response.status_code == 200:
            flags_category = response.json()
            print_result(True, f"Created Flags category: {flags_category['name']} with icon {flags_category['icon']}")
            flags_id = flags_category['id']
        else:
            print_result(False, f"Failed to create Flags category: {response.status_code} - {response.text}")
            return None, None
    except Exception as e:
        print_result(False, f"Error creating Flags category: {e}")
        return None, None
    
    # Test 2: Create Vehicles category
    vehicles_data = {
        "name": "Vehicles",
        "icon": "🚗",
        "color": "#2196F3"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/categories", json=vehicles_data)
        if response.status_code == 200:
            vehicles_category = response.json()
            print_result(True, f"Created Vehicles category: {vehicles_category['name']} with icon {vehicles_category['icon']}")
            vehicles_id = vehicles_category['id']
        else:
            print_result(False, f"Failed to create Vehicles category: {response.status_code} - {response.text}")
            return flags_id, None
    except Exception as e:
        print_result(False, f"Error creating Vehicles category: {e}")
        return flags_id, None
    
    # Test 3: Try to create duplicate category (should fail)
    try:
        response = requests.post(f"{BACKEND_URL}/categories", json=flags_data)
        if response.status_code == 400:
            print_result(True, "Correctly rejected duplicate category creation")
        else:
            print_result(False, f"Should have rejected duplicate category: {response.status_code}")
    except Exception as e:
        print_result(False, f"Error testing duplicate category: {e}")
    
    return flags_id, vehicles_id

def test_get_categories():
    """Test fetching all categories"""
    print_test_header("Get All Categories")
    
    try:
        response = requests.get(f"{BACKEND_URL}/categories")
        if response.status_code == 200:
            categories = response.json()
            print_result(True, f"Fetched {len(categories)} categories")
            
            # Verify both categories exist with image_count = 0
            flags_found = False
            vehicles_found = False
            
            for cat in categories:
                print(f"  - {cat['name']}: {cat['icon']} (color: {cat['color']}, images: {cat['image_count']})")
                if cat['name'] == 'Flags' and cat['image_count'] == 0:
                    flags_found = True
                elif cat['name'] == 'Vehicles' and cat['image_count'] == 0:
                    vehicles_found = True
            
            if flags_found and vehicles_found:
                print_result(True, "Both categories found with image_count = 0")
            else:
                print_result(False, f"Categories verification failed. Flags: {flags_found}, Vehicles: {vehicles_found}")
            
            return categories
        else:
            print_result(False, f"Failed to fetch categories: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print_result(False, f"Error fetching categories: {e}")
        return []

def test_upload_single_puzzle():
    """Test uploading a single puzzle to Flags category"""
    print_test_header("Upload Single Puzzle to Category")
    
    puzzle_data = {
        "name": "Test Flag Puzzle",
        "image_base64": TEST_IMAGE_FLAG,
        "category": "Flags"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/puzzles", json=puzzle_data)
        if response.status_code == 200:
            puzzle = response.json()
            print_result(True, f"Uploaded puzzle: {puzzle['name']} to category {puzzle['category']}")
            return puzzle['id']
        else:
            print_result(False, f"Failed to upload puzzle: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_result(False, f"Error uploading puzzle: {e}")
        return None

def test_bulk_upload():
    """Test bulk uploading multiple images to Vehicles category"""
    print_test_header("Bulk Upload to Vehicles Category")
    
    bulk_data = {
        "category": "Vehicles",
        "images": [
            {
                "name": "Test Car",
                "image_base64": TEST_IMAGE_CAR
            },
            {
                "name": "Test Truck",
                "image_base64": TEST_IMAGE_TRUCK
            }
        ]
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/puzzles/bulk", json=bulk_data)
        if response.status_code == 200:
            result = response.json()
            print_result(True, f"Bulk upload successful: {result['message']}")
            print(f"  Uploaded items: {result['uploaded']}")
            return [item['id'] for item in result['uploaded']]
        else:
            print_result(False, f"Failed bulk upload: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print_result(False, f"Error in bulk upload: {e}")
        return []

def test_get_preloaded_puzzles():
    """Test fetching preloaded puzzles organized by category"""
    print_test_header("Get Preloaded Puzzles by Category")
    
    try:
        response = requests.get(f"{BACKEND_URL}/puzzles/preloaded")
        if response.status_code == 200:
            categorized_puzzles = response.json()
            print_result(True, f"Fetched preloaded puzzles organized in {len(categorized_puzzles)} categories")
            
            for category_group in categorized_puzzles:
                cat_name = category_group['category']
                puzzles_count = len(category_group['puzzles'])
                icon = category_group.get('icon', 'N/A')
                color = category_group.get('color', 'N/A')
                print(f"  - {cat_name} ({icon}): {puzzles_count} puzzles (color: {color})")
                
                # Verify structure
                for puzzle in category_group['puzzles'][:2]:  # Show first 2
                    print(f"    * {puzzle['name']} (ID: {puzzle['id']})")
            
            return categorized_puzzles
        else:
            print_result(False, f"Failed to fetch preloaded puzzles: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print_result(False, f"Error fetching preloaded puzzles: {e}")
        return []

def test_get_category_puzzles():
    """Test fetching puzzles for specific category"""
    print_test_header("Get Puzzles for Vehicles Category")
    
    try:
        response = requests.get(f"{BACKEND_URL}/puzzles/category/Vehicles")
        if response.status_code == 200:
            vehicles_puzzles = response.json()
            print_result(True, f"Fetched {len(vehicles_puzzles)} puzzles from Vehicles category")
            
            for puzzle in vehicles_puzzles:
                print(f"  - {puzzle['name']} (ID: {puzzle['id']}, Category: {puzzle['category']})")
            
            return vehicles_puzzles
        else:
            print_result(False, f"Failed to fetch Vehicles puzzles: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print_result(False, f"Error fetching Vehicles puzzles: {e}")
        return []

def test_delete_category(category_id):
    """Test deleting a category and verify images become uncategorized"""
    print_test_header("Delete Flags Category")
    
    try:
        response = requests.delete(f"{BACKEND_URL}/categories/{category_id}")
        if response.status_code == 200:
            result = response.json()
            print_result(True, f"Deleted category: {result['message']}")
            return True
        else:
            print_result(False, f"Failed to delete category: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_result(False, f"Error deleting category: {e}")
        return False

def test_verify_uncategorized():
    """Verify that deleted category's images are now uncategorized"""
    print_test_header("Verify Images Became Uncategorized")
    
    try:
        # Check preloaded puzzles for uncategorized section
        response = requests.get(f"{BACKEND_URL}/puzzles/preloaded")
        if response.status_code == 200:
            categorized_puzzles = response.json()
            
            uncategorized_found = False
            for category_group in categorized_puzzles:
                if category_group['category'] == 'Uncategorized':
                    uncategorized_found = True
                    puzzles_count = len(category_group['puzzles'])
                    print_result(True, f"Found Uncategorized section with {puzzles_count} puzzles")
                    
                    for puzzle in category_group['puzzles']:
                        print(f"  - {puzzle['name']} (ID: {puzzle['id']})")
                    break
            
            if not uncategorized_found:
                print_result(False, "No Uncategorized section found")
            
        else:
            print_result(False, f"Failed to fetch preloaded puzzles: {response.status_code}")
    except Exception as e:
        print_result(False, f"Error verifying uncategorized: {e}")

def test_get_all_puzzles():
    """Test that GET /api/puzzles still returns all images"""
    print_test_header("Verify GET /api/puzzles Returns All Images")
    
    try:
        response = requests.get(f"{BACKEND_URL}/puzzles")
        if response.status_code == 200:
            all_puzzles = response.json()
            print_result(True, f"GET /api/puzzles returned {len(all_puzzles)} total puzzles")
            
            # Show breakdown by category
            category_counts = {}
            for puzzle in all_puzzles:
                cat = puzzle.get('category', 'None')
                category_counts[cat] = category_counts.get(cat, 0) + 1
            
            print("  Category breakdown:")
            for cat, count in category_counts.items():
                print(f"    - {cat}: {count} puzzles")
            
            return all_puzzles
        else:
            print_result(False, f"Failed to fetch all puzzles: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print_result(False, f"Error fetching all puzzles: {e}")
        return []

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