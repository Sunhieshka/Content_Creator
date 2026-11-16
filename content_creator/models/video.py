from dataclasses import dataclass, field
from typing import Literal, Optional

Resolution = Literal["480p", "720p", "1080p","4k"]
AspectRatio = Literal["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"]


@dataclass
class VideoConfig:
    resolution: Optional[Resolution] = None
    ratio: Optional[AspectRatio] = None
    frames_per_second: Optional[int] = None
    duration: Optional[int] = None
    seed: Optional[int] = None


@dataclass
class VideoStartRequest:
    content: str
    config: VideoConfig = field(default_factory=VideoConfig)
    reference_images: list[str] = field(default_factory=list)
    reference_assets: list[str] = field(default_factory=list)
    reference_image_roles: list[str] = field(default_factory=list)
    extra_reference_images: list[str] = field(default_factory=list)
    audios: list[str] = field(default_factory=list)
    videos: list[str] = field(default_factory=list)
    draft_task_id: Optional[str] = None
    start_frame_url: Optional[str] = None
    start_from_ref_video_last_frame: bool = False


@dataclass
class VideoStartResponse:
    task_id: str
    generated_prompt: str


@dataclass
class VideoTaskError:
    message: str


@dataclass
class VideoTask:
    status: str
    video_url: str = ""
    file_url: str = ""
    error: Optional[VideoTaskError] = None


@dataclass
class VideoStatusResponse:
    task: VideoTask


@dataclass
class VideoCombineRequest:
    video_urls: list[str]


@dataclass
class VideoCombineResponse:
    file_url: str


@dataclass
class VideoUploadAssetResponse:
    asset_id: str
    asset_url: str


@dataclass
class ExtractLastFrameResponse:
    image: str
