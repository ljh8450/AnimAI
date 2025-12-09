package com.example.animai.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Egg {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private User owner;

    @Builder.Default
    private boolean hatched = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();;

    private LocalDateTime hatchedAt;

    @Lob
    private String traitJson; // 부화 직전에 추론된 특성 정보
}
