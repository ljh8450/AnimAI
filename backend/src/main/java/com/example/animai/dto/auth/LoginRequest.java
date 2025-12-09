package com.example.animai.dto.auth;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginRequest {
    private String email;
    private String nickname; // 선택사항: 안 보내면 서버에서 기본값 설정
}
