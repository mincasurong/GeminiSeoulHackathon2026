import unittest
from unittest.mock import patch, MagicMock
import json
import base64
import sys
import os

# Ensure backend is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# We need to mock llama_cpp before importing local_gemma_service
# so it doesn't fail on ImportError or try to load a model.
sys.modules['llama_cpp'] = MagicMock()
sys.modules['llama_cpp.llama_chat_format'] = MagicMock()

import local_gemma_service
# Force LLAMA_CPP_AVAILABLE to True for testing
local_gemma_service.LLAMA_CPP_AVAILABLE = True

from local_gemma_service import LocalGemmaService

class TestLocalGemmaService(unittest.TestCase):

    @patch('local_gemma_service.os.path.exists')
    @patch('local_gemma_service.Llama')
    def test_extract_topology_success(self, mock_llama_class, mock_exists):
        # Mock os.path.exists so it thinks the model files are present
        mock_exists.return_value = True

        # Setup mock LLM instance
        mock_llm_instance = MagicMock()
        mock_llama_class.return_value = mock_llm_instance

        # Expected structured output from the model
        expected_json = {
            "node_name": "Living Room Center",
            "static_anchors": [
                {"anchor_id": "a1", "type": "sofa", "description": "Large grey sofa", "image_indices": [0]}
            ],
            "dynamic_objects": [],
            "navigable_edges": [
                {"edge_id": "e1", "description": "Doorway to kitchen", "visual_cue": "Wooden door frame"}
            ]
        }

        # Mock the create_chat_completion response
        mock_llm_instance.create_chat_completion.return_value = {
            "choices": [
                {
                    "message": {
                        "content": json.dumps(expected_json)
                    }
                }
            ]
        }

        # Create dummy image data
        dummy_images = [
            {"mime_type": "image/jpeg", "data": base64.b64encode(b"dummy1").decode('utf-8')},
            {"mime_type": "image/jpeg", "data": base64.b64encode(b"dummy2").decode('utf-8')}
        ]

        # Reset the singleton LLM if it was set
        LocalGemmaService._llm = None

        # Call the method
        actual_name, result = LocalGemmaService.extract_topology(dummy_images, "DefaultNode")

        # Assertions
        self.assertEqual(actual_name, "Living Room Center")
        self.assertEqual(result["node_name"], "Living Room Center")
        self.assertEqual(len(result["static_anchors"]), 1)
        self.assertEqual(result["static_anchors"][0]["anchor_id"], "a1")

        # Verify chat completion was called with correct schema format
        mock_llm_instance.create_chat_completion.assert_called_once()
        call_kwargs = mock_llm_instance.create_chat_completion.call_args.kwargs
        self.assertIn("response_format", call_kwargs)
        self.assertEqual(call_kwargs["response_format"]["type"], "json_object")
        self.assertEqual(call_kwargs["response_format"]["schema"]["type"], "object")

        print("test_extract_topology_success passed!")

    @patch('local_gemma_service.os.path.exists')
    @patch('local_gemma_service.Llama')
    def test_plan_trajectory(self, mock_llama_class, mock_exists):
        mock_exists.return_value = True
        mock_llm_instance = MagicMock()
        mock_llama_class.return_value = mock_llm_instance

        expected_plan = {
            "plan": ["NodeA", "NodeB", "NodeC"],
            "message": "Taking the shortest path through the hallway."
        }

        mock_llm_instance.create_chat_completion.return_value = {
            "choices": [
                {
                    "message": {
                        "content": json.dumps(expected_plan)
                    }
                }
            ]
        }

        LocalGemmaService._llm = None
        result = LocalGemmaService.plan_trajectory(
            nodes_list=["NodeA", "NodeB", "NodeC"],
            edges_list=[("NodeA", "NodeB"), ("NodeB", "NodeC")],
            context_data={},
            current_node="NodeA",
            user_query="Go to NodeC"
        )

        self.assertEqual(result["plan"], ["NodeA", "NodeB", "NodeC"])
        self.assertEqual(result["message"], "Taking the shortest path through the hallway.")

        print("test_plan_trajectory passed!")

    @patch('local_gemma_service.os.path.exists')
    @patch('local_gemma_service.Llama')
    def test_chat_with_environment(self, mock_llama_class, mock_exists):
        mock_exists.return_value = True
        mock_llm_instance = MagicMock()
        mock_llama_class.return_value = mock_llm_instance

        expected_response = "The sofa is located on the North side of the living room."

        mock_llm_instance.create_chat_completion.return_value = {
            "choices": [
                {
                    "message": {
                        "content": expected_response
                    }
                }
            ]
        }

        query = "Where is the sofa?"
        topology = {
            "node_name": "Living Room",
            "static_anchors": [
                {"anchor_id": "a1", "type": "sofa"}
            ]
        }
        history = [
            {"role": "user", "text": "What room is this?"},
            {"role": "assistant", "text": "This is the Living Room."}
        ]

        LocalGemmaService._llm = None
        result = LocalGemmaService.chat_with_environment(
            query=query,
            topology=topology,
            history=history,
            map_image_b64="data:image/jpeg;base64,mockmap",
            source_images=[{"mime_type": "image/jpeg", "data": "mocksrc"}]
        )

        print(result)
        self.assertEqual(result, expected_response)

        messages = mock_llm_instance.create_chat_completion.call_args.kwargs["messages"]
        self.assertEqual(len(messages), 4)
        self.assertEqual(messages[0]["role"], "system")
        self.assertEqual(messages[1]["role"], "user")
        self.assertEqual(messages[2]["role"], "assistant")
        self.assertEqual(messages[3]["role"], "user")
        
        user_content = messages[3]["content"]
        self.assertEqual(len(user_content), 3) # map image, 1 source image, text
        
        print("test_chat_with_environment passed!")

if __name__ == '__main__':
    unittest.main()
