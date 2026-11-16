from dataclasses import dataclass, field


@dataclass
class WorldBuildRequest:
    subject: str
    action: str
    environment: str
    lighting: str
    camera: str
    style: str
    quality: str
    reference_images: list[str] = field(default_factory=list)


@dataclass
class StoryboardPrompts:
    wide_establishing: str = ""
    wide_location: str = ""
    medium_character: str = ""
    medium_action: str = ""
    closeup_face: str = ""
    closeup_hands: str = ""
    prop_detail: str = ""
    environment_detail: str = ""


@dataclass
class StoryboardFrames:
    wide_establishing: list[str] = field(default_factory=list)
    wide_location: list[str] = field(default_factory=list)
    medium_character: list[str] = field(default_factory=list)
    medium_action: list[str] = field(default_factory=list)
    closeup_face: list[str] = field(default_factory=list)
    closeup_hands: list[str] = field(default_factory=list)
    prop_detail: list[str] = field(default_factory=list)
    environment_detail: list[str] = field(default_factory=list)


@dataclass
class StoryboardPromptsResponse:
    prompts: StoryboardPrompts


@dataclass
class StoryboardFramesResponse:
    frames: StoryboardFrames
