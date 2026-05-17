from datetime import datetime, timedelta


class AILogicEngine:
    @staticmethod
    def process_outcome(analysis: dict):
        """
        Logic for Phase 5: Workflow Automation
        """
        sentiment = analysis.get("sentiment", "neutral")
        intent = analysis.get("intent", "unknown")
        
        decision = {
            "follow_up": False,
            "mark_cold": False,
            "retry": False,
            "reschedule": False
        }

        if intent == "busy" and sentiment == "positive":
            decision["reschedule"] = True 
        elif intent == "interested" or sentiment == "positive":
            decision["follow_up"] = True
        elif intent == "not interested":
            decision["mark_cold"] = True
        elif intent == "callback":
            decision["retry"] = True
            
        return decision
    

    @staticmethod
    def get_reschedule_time():
        """Default reschedule: 2 hours from now."""
        return datetime.utcnow() + timedelta(hours=2)

