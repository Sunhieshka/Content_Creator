from dataclasses import dataclass
from typing import Literal

SheetKey = Literal["instruction_1"]


@dataclass
class T2IRequest:
    prompt: str


@dataclass
class I2IRequest:
    prompt: str
    images: list[str]


@dataclass
class AssetRef:
    asset_id: str
    group_id: str
    asset_url: str


@dataclass
class CharacterImageResponse:
    image: str
    asset: AssetRef


@dataclass
class CharacterSheetAssets:
    group_id: str
    asset_ids: dict[str, str]
    asset_urls: dict[str, str]


@dataclass
class CharacterSheetResponse:
    images: dict[str, str]
    assets: CharacterSheetAssets
