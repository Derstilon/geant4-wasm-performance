from typing import Literal, TypedDict, List, Union

class TimeStampEntity(TypedDict):
    timeStampLabel: str
    value: float

class StepLogEntity(TypedDict):
    handleStart: int
    optimizeStart: Union[int, None]
    renderStart: Union[int, None]
    stepEnd: int
    remainingMessages: int

class MessageLogEntity(TypedDict):
    sendTime: int
    receiveTime: int
    handleTime: int
    packageSize: int

class Result(TypedDict):
    numberOfSimulatedEvents: str  # Assuming "integer" means it's represented as a string
    numberOfBins: str  # Assuming "integer" means it's represented as a string
    particleType: Union[Literal["electron"], Literal["proton"]]
    dataHandling: Union[Literal["new_raw"], Literal["all_raw"], Literal["new_processed"], Literal["all_processed"], Literal["none"]]
    targetFrames: str  # Assuming "float" means it's represented as a string
    browser: str
    timeStamps: List[TimeStampEntity]
    renderTime: int
    frameCount: int
    stepLogs: List[StepLogEntity]
    handleTime: int
    messageCount: int
    dataSize: int
    messageLogs: List[MessageLogEntity]