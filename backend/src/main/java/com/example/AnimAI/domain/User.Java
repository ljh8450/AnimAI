package com.example.AnimAI.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String email;

    private String password; // 처음엔 평문으로 두고 나중에 암호화

    private String nickname;

    private LocalDateTime createdAt;
}
