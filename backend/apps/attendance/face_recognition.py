"""
Face recognition utilities for attendance.
"""
import logging
import numpy as np
from io import BytesIO
from io import BytesIO
from PIL import Image, ImageOps
from django.conf import settings

logger = logging.getLogger(__name__)

# Flag to check if face_recognition is available
FACE_RECOGNITION_AVAILABLE = False

try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    logger.warning("face_recognition library not available. Using mock implementation.")


def generate_face_encoding(image_file):
    """
    Generate face encoding from an uploaded image.
    
    Args:
        image_file: Django uploaded file object
    
    Returns:
        dict: {
            'success': bool,
            'encoding': list (128-dimensional vector) or None,
            'confidence': float,
            'error': str or None
        }
    """
    if not FACE_RECOGNITION_AVAILABLE:
        # Return mock encoding for development
        return {
            'success': True,
            'encoding': list(np.random.rand(128)),
            'confidence': 0.95,
            'error': None
        }
    
    try:
        # Read image
        image_data = image_file.read()
        image = Image.open(BytesIO(image_data))
        image = ImageOps.exif_transpose(image)
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to numpy array
        image_array = np.array(image)
        
        # Find face locations
        face_locations = face_recognition.face_locations(image_array)
        
        if not face_locations:
            return {
                'success': False,
                'encoding': None,
                'confidence': 0.0,
                'error': 'No face detected in the image'
            }
        
        if len(face_locations) > 1:
            return {
                'success': False,
                'encoding': None,
                'confidence': 0.0,
                'error': 'Multiple faces detected. Please upload an image with only one face.'
            }
        
        # Generate encoding
        encodings = face_recognition.face_encodings(image_array, face_locations)
        
        if not encodings:
            return {
                'success': False,
                'encoding': None,
                'confidence': 0.0,
                'error': 'Could not generate face encoding'
            }
        
        encoding = encodings[0]
        
        # Reset file pointer
        image_file.seek(0)
        
        return {
            'success': True,
            'encoding': encoding.tolist(),
            'confidence': 1.0,  # face_recognition doesn't provide confidence for encoding
            'error': None
        }
    
    except Exception as e:
        logger.error(f"Error generating face encoding: {str(e)}")
        return {
            'success': False,
            'encoding': None,
            'confidence': 0.0,
            'error': str(e)
        }


def match_face(image_file, student_encodings, tolerance=None):
    """
    Match a face in an image against known student encodings.
    
    Args:
        image_file: Django uploaded file object
        student_encodings: List of dicts with 'student_id' and 'encoding'
        tolerance: Float, lower means stricter matching (default from settings)
    
    Returns:
        dict: {
            'success': bool,
            'student_id': UUID or None,
            'confidence': float,
            'error': str or None
        }
    """
    if tolerance is None:
        tolerance = getattr(settings, 'FACE_RECOGNITION_TOLERANCE', 0.6)
    
    min_confidence = getattr(settings, 'FACE_RECOGNITION_MIN_CONFIDENCE', 0.7)
    
    if not FACE_RECOGNITION_AVAILABLE:
        # Return mock match for development (match first student)
        if student_encodings:
            return {
                'success': True,
                'student_id': student_encodings[0]['student_id'],
                'confidence': 0.92,
                'error': None
            }
        return {
            'success': False,
            'student_id': None,
            'confidence': 0.0,
            'error': 'No students to match against'
        }
    
    try:
        # Read image
        image_data = image_file.read()
        image = Image.open(BytesIO(image_data))
        image = ImageOps.exif_transpose(image)
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        image_array = np.array(image)
        
        # Find face in scan image
        face_locations = face_recognition.face_locations(image_array)
        
        if not face_locations:
            return {
                'success': False,
                'student_id': None,
                'confidence': 0.0,
                'error': 'No face detected'
            }
        
        # Generate encoding for scanned face
        scan_encodings = face_recognition.face_encodings(image_array, face_locations)
        
        if not scan_encodings:
            return {
                'success': False,
                'student_id': None,
                'confidence': 0.0,
                'error': 'Could not process face'
            }
        
        scan_encoding = scan_encodings[0]
        
        # Compare against known encodings
        best_match = None
        best_distance = float('inf')
        
        for student_data in student_encodings:
            known_encoding = np.array(student_data['encoding'])
            
            # Calculate face distance
            distance = face_recognition.face_distance([known_encoding], scan_encoding)[0]
            
            if distance < best_distance:
                best_distance = distance
                best_match = student_data['student_id']
        
        # Reset file pointer
        image_file.seek(0)
        
        # Convert distance to confidence (0 = perfect match, 1 = no match)
        confidence = 1 - best_distance
        
        # Convert distance to confidence (0 = perfect match, 1 = no match)
        confidence = 1 - best_distance
        
        logger.info(f"Face match result: distance={best_distance:.4f}, confidence={confidence:.4f}, tolerance={tolerance}")
        
        if best_distance <= tolerance and confidence >= min_confidence:
            logger.info(f"Match found: student_id={best_match}")
            return {
                'success': True,
                'student_id': best_match,
                'confidence': confidence,
                'error': None
            }
        else:
            logger.warning(f"No match found: best_distance={best_distance:.4f} > tolerance={tolerance}")
            return {
                'success': False,
                'student_id': None,
                'confidence': confidence,
                'error': 'No matching student found'
            }
    
    except Exception as e:
        logger.error(f"Error matching face: {str(e)}")
        return {
            'success': False,
            'student_id': None,
            'confidence': 0.0,
            'error': str(e)
        }


def verify_face(image_file, known_encoding, tolerance=None):
    """
    Verify if a face matches a specific known encoding.
    
    Args:
        image_file: Django uploaded file object
        known_encoding: List (128-dimensional vector)
        tolerance: Float, lower means stricter matching
    
    Returns:
        dict: {
            'success': bool,
            'is_match': bool,
            'confidence': float,
            'error': str or None
        }
    """
    if tolerance is None:
        tolerance = getattr(settings, 'FACE_RECOGNITION_TOLERANCE', 0.6)
    
    if not FACE_RECOGNITION_AVAILABLE:
        # Mock verification for development
        return {
            'success': True,
            'is_match': True,
            'confidence': 0.88,
            'error': None
        }
    
    try:
        # Read image
        image_data = image_file.read()
        image = Image.open(BytesIO(image_data))
        image = ImageOps.exif_transpose(image)
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        image_array = np.array(image)
        
        # Find face
        face_locations = face_recognition.face_locations(image_array)
        
        if not face_locations:
            return {
                'success': False,
                'is_match': False,
                'confidence': 0.0,
                'error': 'No face detected'
            }
        
        # Generate encoding
        scan_encodings = face_recognition.face_encodings(image_array, face_locations)
        
        if not scan_encodings:
            return {
                'success': False,
                'is_match': False,
                'confidence': 0.0,
                'error': 'Could not process face'
            }
        
        scan_encoding = scan_encodings[0]
        known_array = np.array(known_encoding)
        
        # Compare
        distance = face_recognition.face_distance([known_array], scan_encoding)[0]
        confidence = 1 - distance
        is_match = distance <= tolerance
        
        # Reset file pointer
        image_file.seek(0)
        
        return {
            'success': True,
            'is_match': is_match,
            'confidence': confidence,
            'error': None
        }
    
    except Exception as e:
        logger.error(f"Error verifying face: {str(e)}")
        return {
            'success': False,
            'is_match': False,
            'confidence': 0.0,
            'error': str(e)
        }
