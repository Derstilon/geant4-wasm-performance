from typing import Literal, TypedDict, List, Union, NamedTuple

class TimeStampEntity(NamedTuple):
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
    numberOfSimulatedEvents: int  # Assuming "integer" means it's represented as a string
    numberOfBins: int  # Assuming "integer" means it's represented as a string
    particleType: Union[Literal["electron"], Literal["proton"]]
    dataHandling: Union[Literal["new_raw"], Literal["all_raw"], Literal["new_optimized"], Literal["all_optimized"], Literal["none"]]
    targetFrames: float  # Assuming "float" means it's represented as a string
    browser: str
    timeStamps: List[TimeStampEntity]
    stepLogs: List[StepLogEntity]
    messageLogs: List[MessageLogEntity]
    renderTime: int
    frameCount: int
    handleTime: int
    optimizeTime: int
    messageCount: int
    dataSize: int