"""
Edge-Ready Crop Disease Inference Prototype
EKYAN AI & Agritech Framework | UNICEF Kenya
"""

import sys
import json
from dataclasses import dataclass
from typing import Dict, List, Tuple


@dataclass
class DiseaseRemedy:
    disease_name: str
    crop: str
    swahili_name: str
    remedy_swahili: str
    remedy_english: str
    preventative_measure: str


# Knowledge Base of Organic / Climate-Smart Remedies
KNOWLEDGE_BASE: Dict[str, DiseaseRemedy] = {
    "tomato_early_blight": DiseaseRemedy(
        disease_name="Early Blight (Alternaria solani)",
        crop="Tomato",
        swahili_name="Ukungu wa Awali wa Nyanya",
        remedy_swahili="Nyunyizia mchanganyiko wa majivu ya jikoni na maji, au mafuta ya mwarobaini (neem oil) kila baada ya siku 7. Ondoa majani yaliyoathirika chini ya shina.",
        remedy_english="Spray with kitchen wood-ash solution or organic neem oil every 7 days. Prune and safely burn heavily infected lower foliage.",
        preventative_measure="Practice crop rotation and avoid overhead sprinkler watering on tomato leaves."
    ),
    "maize_fall_armyworm": DiseaseRemedy(
        disease_name="Fall Armyworm (Spodoptera frugiperda)",
        crop="Maize",
        swahili_name="Kiwavi Jeshi Vamizi wa Mahindi",
        remedy_swahili="Weka mchanga safi au majivu ndani ya kitovu cha mmea wa mahindi asubuhi mapema. Nyunyizia mchanganyiko wa pilipili na sabuni asili.",
        remedy_english="Drop clean sand or fine wood ash directly into the maize whorl in early morning. Apply garlic-chili organic extract.",
        preventative_measure="Intercrop maize with desmodium and push-pull fodder grass to repel moths."
    ),
    "cassava_mosaic_disease": DiseaseRemedy(
        disease_name="Cassava Mosaic Disease (CMD)",
        crop="Cassava",
        swahili_name="Ugonjwa wa Batobato wa Muhogo",
        remedy_swahili="Kung'oa na kuchoma mashina yaliyoathirika mara moja ili kuzuia inzi weupe (whiteflies) kueneza ugonjwa kwenye mimea mingine.",
        remedy_english="Rogue and safely destroy infected plants immediately to prevent whiteflies from vectoring the virus to healthy crops.",
        preventative_measure="Plant certified disease-free, resistant cassava stem cuttings."
    )
}


class EdgeCropClassifier:
    """
    Simulates on-device lightweight quantized neural inference (TFLite / ONNX Runtime).
    Designed to execute in < 80ms on budget smartphones without internet connection.
    """
    def __init__(self, model_path: str = "models/mobilenetv3_ekyan_quantized.tflite"):
        self.model_path = model_path
        self.labels = list(KNOWLEDGE_BASE.keys())

    def preprocess_image(self, image_bytes: bytes) -> bytes:
        """Resize to 224x224 RGB normalized tensor."""
        # In mobile runtime, handled via Android Bitmap / NDK
        return image_bytes

    def predict(self, image_data: bytes) -> Dict:
        """
        Runs edge inference and pairs diagnosis with organic localized remedy.
        """
        # Simulated high-confidence inference for demonstration
        predicted_disease_key = "tomato_early_blight"
        confidence_score = 0.942

        remedy = KNOWLEDGE_BASE[predicted_disease_key]

        return {
            "status": "success",
            "offline_inference": True,
            "latency_ms": 68.4,
            "crop": remedy.crop,
            "diagnosis": remedy.disease_name,
            "swahili_diagnosis": remedy.swahili_name,
            "confidence": round(confidence_score, 3),
            "remedy": {
                "swahili": remedy.remedy_swahili,
                "english": remedy.remedy_english,
                "prevention": remedy.preventative_measure
            }
        }


if __name__ == "__main__":
    classifier = EdgeCropClassifier()
    result = classifier.predict(b"dummy_image_bytes")
    print(json.dumps(result, indent=2))
