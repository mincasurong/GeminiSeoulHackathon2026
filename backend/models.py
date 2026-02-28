from pydantic import BaseModel

class QueryPayload(BaseModel):
    user_query: str
    current_node: str
